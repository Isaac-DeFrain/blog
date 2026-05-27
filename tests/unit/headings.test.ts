/**
 * Unit tests for shared heading utilities.
 */
import { describe, it, expect } from "vitest";
import { extractHeadingTitle, generateHeadingId } from "../../src/utils/headings";

describe("generateHeadingId", () => {
  it("creates a GitHub-style slug", () => {
    expect(generateHeadingId("Interactive Oracle Proof (IOP)")).toBe("interactive-oracle-proof-iop");
  });
});

describe("extractHeadingTitle", () => {
  it("extracts the label from linked headings", () => {
    expect(extractHeadingTitle("[Arithmetic Circuit](https://example.com)")).toBe("Arithmetic Circuit");
  });

  it("strips HTML tags from plain headings", () => {
    expect(extractHeadingTitle("<strong>Reed-Solomon</strong> codes")).toBe("Reed-Solomon codes");
  });

  it("returns trimmed plain text for unlinked headings", () => {
    expect(extractHeadingTitle("  Fast Fourier Transform  ")).toBe("Fast Fourier Transform");
  });
});
