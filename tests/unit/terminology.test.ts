/**
 * Unit tests for terminology glossary utilities
 */

import { describe, it, expect } from "vitest";
import { generateHeadingId } from "../../src/utils/headings";
import {
  TERMINOLOGY_PLACEHOLDER,
  buildPostUrl,
  collectTerminologyPostIds,
  isTerminologyPost,
  parseTerminologyDefinitions,
  resolveRelativePostId,
  resolveTerminologyLink,
  rewriteInternalPostLink,
  rewritePostsLinkToRoot,
} from "../../src/utils/terminology";
import type { BlogPost } from "../../src/blog/types";

const glossaryPost: BlogPost = {
  id: "zk/zk-terminology",
  name: "Zero-Knowledge Terminology",
  date: "2026-02-07",
  file: "zk/zk-terminology.md",
  topics: ["zk", "terminology"],
};

const regularPost: BlogPost = {
  id: "zk/fri-paper-summary",
  name: "FRI paper summary",
  date: "2026-02-07",
  file: "zk/fri-paper-summary.md",
  topics: ["zk"],
};

const terminologyIds = collectTerminologyPostIds([glossaryPost, regularPost]);

const sampleGlossary = `---
name: Zero-Knowledge Terminology
date: 2026-02-07
topics:
  - terminology
---

# Zero-Knowledge Terminology

## [Arithmetic Circuit](https://example.com)

An **arithmetic circuit** over a field.

## [Fast Fourier Transform](TODO)

TODO

## [Reed-Solomon codes](https://example.com)

Content about RS codes.
`;

describe("isTerminologyPost", () => {
  it("returns true when topics includes terminology", () => {
    expect(isTerminologyPost(glossaryPost)).toBe(true);
  });

  it("returns false for regular posts", () => {
    expect(isTerminologyPost(regularPost)).toBe(false);
  });
});

describe("collectTerminologyPostIds", () => {
  it("collects only terminology glossary post IDs", () => {
    expect(collectTerminologyPostIds([glossaryPost, regularPost])).toEqual(new Set(["zk/zk-terminology"]));
  });
});

describe("parseTerminologyDefinitions", () => {
  it("parses glossary sections keyed by heading slug", () => {
    const definitions = parseTerminologyDefinitions(sampleGlossary);

    expect(definitions.get("arithmetic-circuit")?.title).toBe("Arithmetic Circuit");
    expect(definitions.get("arithmetic-circuit")?.bodyMarkdown).toContain("arithmetic circuit");

    expect(definitions.get("fast-fourier-transform")?.title).toBe("Fast Fourier Transform");
    expect(definitions.get("fast-fourier-transform")?.bodyMarkdown).toBe(TERMINOLOGY_PLACEHOLDER);

    expect(definitions.get("reed-solomon-codes")?.title).toBe("Reed-Solomon codes");
  });

  it("generates term IDs matching processHeading slugs", () => {
    const definitions = parseTerminologyDefinitions(sampleGlossary);
    expect(generateHeadingId("Interactive Oracle Proofs of Proximity")).toBe("interactive-oracle-proofs-of-proximity");
    expect(definitions.has("reed-solomon-codes")).toBe(true);
  });
});

describe("resolveRelativePostId", () => {
  it("resolves same-directory relative links", () => {
    expect(resolveRelativePostId("./zk-terminology", "zk/fri-paper-summary")).toBe("zk/zk-terminology");
  });

  it("strips markdown extension", () => {
    expect(resolveRelativePostId("./zk-terminology.md", "zk/fri-paper-summary")).toBe("zk/zk-terminology");
  });
});

describe("rewriteInternalPostLink", () => {
  it("rewrites posts/ links to SPA URLs", () => {
    expect(rewritePostsLinkToRoot("posts/zk/zk-terminology.md#reed-solomon-codes", "/")).toBe(
      "/zk/zk-terminology#reed-solomon-codes",
    );
  });

  it("rewrites same-directory relative glossary links", () => {
    expect(rewriteInternalPostLink("./zk-terminology#arithmetic-complexity", "/", "zk/fri-paper-summary")).toBe(
      "/zk/zk-terminology#arithmetic-complexity",
    );
  });

  it("builds URLs with base path", () => {
    expect(buildPostUrl("/blog/", "zk/zk-terminology", "reed-solomon-codes")).toBe(
      "/blog/zk/zk-terminology#reed-solomon-codes",
    );
  });
});

describe("resolveTerminologyLink", () => {
  it("resolves SPA glossary links with hash anchors", () => {
    expect(
      resolveTerminologyLink("/zk/zk-terminology#reed-solomon-codes", "/", "zk/fri-paper-summary", terminologyIds),
    ).toEqual({
      postId: "zk/zk-terminology",
      termId: "reed-solomon-codes",
    });
  });

  it("resolves relative glossary links", () => {
    expect(
      resolveTerminologyLink("./zk-terminology#arithmetic-complexity", "/", "zk/fri-paper-summary", terminologyIds),
    ).toEqual({
      postId: "zk/zk-terminology",
      termId: "arithmetic-complexity",
    });
  });

  it("returns null for links without hash anchors", () => {
    expect(resolveTerminologyLink("/zk/zk-terminology", "/", "zk/fri-paper-summary", terminologyIds)).toBeNull();
  });

  it("returns null for non-terminology targets", () => {
    expect(
      resolveTerminologyLink("/zk/fri-paper-summary#motivation", "/", "zk/fri-paper-summary", terminologyIds),
    ).toBeNull();
  });
});
