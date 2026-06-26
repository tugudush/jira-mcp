import { describe, it, expect } from "vitest";
import { formatText } from "../src/formatters/text.js";
import { formatJson } from "../src/formatters/json.js";
import { formatToon } from "../src/formatters/toon.js";

describe("formatters/ unit tests", () => {
  describe("formatText", () => {
    it("returns empty string for null or undefined", () => {
      expect(formatText(null)).toBe("");
      expect(formatText(undefined)).toBe("");
    });

    it("returns string as-is", () => {
      expect(formatText("Hello World")).toBe("Hello World");
    });

    it("stringifies structured objects", () => {
      const obj = { a: 1, b: "test" };
      expect(formatText(obj)).toBe(JSON.stringify(obj, null, 2));
    });
  });

  describe("formatJson", () => {
    it("pretty prints JSON with 2-space indentation", () => {
      const obj = { a: 1, b: "test" };
      expect(formatJson(obj)).toBe('{\n  "a": 1,\n  "b": "test"\n}');
    });

    it("returns empty string for undefined", () => {
      expect(formatJson(undefined)).toBe("");
    });
  });

  describe("formatToon", () => {
    it("formats array as TOON compact tabular format", () => {
      const list = [
        { key: "PROJ-1", summary: "Issue 1" },
        { key: "PROJ-2", summary: "Issue 2" },
      ];
      const toon = formatToon(list);
      expect(toon).toContain("PROJ-1");
      expect(toon).toContain("Issue 2");
    });

    it("falls back to pretty JSON if TOON encoding fails", () => {
      const cyclicalObj = { name: "test" } as Record<string, unknown>;
      cyclicalObj.self = cyclicalObj; // Cyclic reference causes encode to fail/throw

      const toon = formatToon(cyclicalObj);
      expect(toon).toContain("[object Object]");
    });

    it("returns empty string for null or undefined", () => {
      expect(formatToon(null)).toBe("");
      expect(formatToon(undefined)).toBe("");
    });
  });
});
