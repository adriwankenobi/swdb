import { describe, expect, it } from "vitest";
import { slugify } from "../slug";

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("A New Hope")).toBe("a-new-hope");
  });
  it("strips punctuation", () => {
    expect(slugify("Tales of the Jedi: The Sith War")).toBe(
      "tales-of-the-jedi-the-sith-war"
    );
  });
  it("collapses separators", () => {
    expect(slugify("  Star   Wars--Episode  ")).toBe("star-wars-episode");
  });
  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});
