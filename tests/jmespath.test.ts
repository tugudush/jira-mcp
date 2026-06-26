import { describe, it, expect } from "vitest";
import { evaluateFilter } from "../src/filters/jmespath.js";

describe("filters/jmespath.ts unit tests", () => {
  const dataset = {
    values: [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false },
      { id: 3, name: "Charlie", active: true },
    ],
    info: { total: 3 },
  };

  it("returns null or undefined as-is", () => {
    expect(evaluateFilter(null, "some.path")).toBeNull();
    expect(evaluateFilter(undefined, "some.path")).toBeUndefined();
  });

  it("filters object keys on simple paths", () => {
    expect(evaluateFilter(dataset, "info.total")).toBe(3);
  });

  it("supports array projection and selection", () => {
    const res = evaluateFilter(dataset, "values[?active].name");
    expect(res).toEqual(["Alice", "Charlie"]);
  });

  it("supports object projections", () => {
    const res = evaluateFilter(
      dataset,
      "values[].{identifier: id, label: name}",
    );
    expect(res).toEqual([
      { identifier: 1, label: "Alice" },
      { identifier: 2, label: "Bob" },
      { identifier: 3, label: "Charlie" },
    ]);
  });

  it("throws error for invalid JMESPath expressions", () => {
    expect(() => evaluateFilter(dataset, "values[[[invalid")).toThrow(
      "Invalid JMESPath expression",
    );
  });
});
