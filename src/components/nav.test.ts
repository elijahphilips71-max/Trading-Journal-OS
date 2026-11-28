import { describe, expect, it } from "vitest";
import { isActive } from "./nav";

describe("isActive", () => {
  it("only marks Home active on the home page", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/trades", "/")).toBe(false);
  });
  it("marks a section active on its sub-pages", () => {
    expect(isActive("/trades/123", "/trades")).toBe(true);
    expect(isActive("/tradesx", "/trades")).toBe(false);
  });
});
