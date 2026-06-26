import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildApiUrl,
  addQueryParams,
  buildAuthHeaders,
  buildRequestHeaders,
  makeRequest,
  makeTextRequest,
  makeWriteRequest,
} from "../src/api.js";
import { resetConfig } from "../src/config.js";
import { WriteDisabledError } from "../src/errors.js";

describe("api.ts unit tests", () => {
  const originalEnv = { ...process.env };
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();

    process.env.JIRA_BASE_URL = "https://example-jira.atlassian.net";
    process.env.JIRA_EMAIL = "user@example.com";
    process.env.JIRA_API_TOKEN = "testtoken";
    process.env.JIRA_ALLOW_WRITES = "false";
    process.env.JIRA_DEBUG = "false";
    process.env.JIRA_REQUEST_TIMEOUT_MS = "1000";

    resetConfig();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
    vi.unstubAllGlobals();
  });

  describe("buildApiUrl", () => {
    it("combines base URL and endpoint with slash correction", () => {
      expect(buildApiUrl("/rest/api/3/myself")).toBe(
        "https://example-jira.atlassian.net/rest/api/3/myself",
      );
      expect(buildApiUrl("rest/api/3/myself")).toBe(
        "https://example-jira.atlassian.net/rest/api/3/myself",
      );
    });
  });

  describe("addQueryParams", () => {
    it("adds standard query params", () => {
      const url = "https://example.com/search";
      const params = { q: "project=PROJ", maxResults: 10, empty: null };
      expect(addQueryParams(url, params)).toBe(
        "https://example.com/search?q=project%3DPROJ&maxResults=10",
      );
    });
  });

  describe("auth and headers", () => {
    it("generates correct Authorization basic header", () => {
      const auth = buildAuthHeaders();
      const expected =
        "Basic " + Buffer.from("user@example.com:testtoken").toString("base64");
      expect(auth.Authorization).toBe(expected);
    });

    it("includes required headers", () => {
      const headers = buildRequestHeaders("application/json");
      expect(headers.Accept).toBe("application/json");
      expect(headers["User-Agent"]).toContain("jira-mcp");
      expect(headers.Authorization).toBeDefined();
    });
  });

  describe("makeRequest", () => {
    it("should return JSON on success", async () => {
      const mockResult = { name: "Alice" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockResult,
      });

      const res = await makeRequest(
        "https://example-jira.atlassian.net/rest/api/3/myself",
      );
      expect(res).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should throw custom API error on HTTP failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ errorMessages: ["Session expired"] }),
      });

      await expect(
        makeRequest("https://example-jira.atlassian.net/rest/api/3/myself"),
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("makeWriteRequest", () => {
    it("throws WriteDisabledError if JIRA_ALLOW_WRITES is false", async () => {
      await expect(
        makeWriteRequest(
          "https://example-jira.atlassian.net/rest/api/3/issue",
          "jira_create_issue",
        ),
      ).rejects.toThrow(WriteDisabledError);
    });

    it("succeeds if JIRA_ALLOW_WRITES is true", async () => {
      process.env.JIRA_ALLOW_WRITES = "true";
      resetConfig();

      const mockBody = { key: "PROJ-123" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: "Created",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockBody,
      });

      const res = await makeWriteRequest(
        "https://example-jira.atlassian.net/rest/api/3/issue",
        "jira_create_issue",
        {
          method: "POST",
          body: JSON.stringify({ summary: "test" }),
        },
      );

      expect(res).toEqual(mockBody);
    });
  });
});
