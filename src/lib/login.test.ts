import { describe, expect, it } from "vitest";
import { normalizeLogin } from "./login";

describe("normalizeLogin", () => {
  it("accepts GitHub-shaped logins", () => {
    expect(normalizeLogin("octocat")).toBe("octocat");
    expect(normalizeLogin("  @octocat ")).toBe("octocat");
    expect(normalizeLogin("a")).toBe("a");
    expect(normalizeLogin("my-handle")).toBe("my-handle");
    expect(normalizeLogin("a".repeat(39))).toBe("a".repeat(39));
  });

  it("rejects anything that cannot be a login", () => {
    expect(normalizeLogin("")).toBeNull();
    expect(normalizeLogin("   ")).toBeNull();
    expect(normalizeLogin("-octocat")).toBeNull();
    expect(normalizeLogin("octocat-")).toBeNull();
    expect(normalizeLogin("octo cat")).toBeNull();
    expect(normalizeLogin("octo_cat")).toBeNull();
    expect(normalizeLogin("octo/cat")).toBeNull();
    expect(normalizeLogin("a".repeat(40))).toBeNull();
  });
});
