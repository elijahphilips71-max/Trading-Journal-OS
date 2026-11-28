import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps paths inside the app", () => {
    expect(safeNext("/trades?f=wins")).toBe("/trades?f=wins");
  });
  it("blocks other sites", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
