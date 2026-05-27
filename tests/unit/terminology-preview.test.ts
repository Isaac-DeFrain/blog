/**
 * Unit tests for terminology hover preview cards.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CSS_CLASSES } from "../../src/blog/constants";
import type { PostLoader } from "../../src/blog/post-loader";
import type { PostRenderer } from "../../src/blog/post-renderer";
import {
  clearTerminologyDefinitionCache,
  initializeTerminologyPreview,
  setTerminologyPreviewContext,
  type TerminologyPreviewContext,
} from "../../src/render/terminology-preview";

const glossaryMarkdown = `---
name: Glossary
date: 2026-01-01
topics:
  - terminology
---

# Glossary

## [IOPP](TODO)

An **interactive oracle proof of proximity**.

## [Math term](TODO)

Inline math $x^2$ here.
`;

function createMockContext(overrides: Partial<TerminologyPreviewContext> = {}): TerminologyPreviewContext {
  return {
    basePath: "/",
    currentPostId: "zk/fri-paper-summary",
    terminologyPostIds: new Set(["zk/zk-terminology"]),
    postLoader: {
      loadPostContent: vi.fn().mockResolvedValue(glossaryMarkdown),
    } as unknown as PostLoader,
    postRenderer: {
      processMarkdown: vi.fn().mockResolvedValue("<p>Rendered definition</p>"),
    } as unknown as PostRenderer,
    postFiles: new Map([["zk/zk-terminology", "zk/zk-terminology.md"]]),
    getHighlightConfig: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as TerminologyPreviewContext;
}

function createContentWithTermLink(href = "/zk/zk-terminology#iopp"): {
  content: HTMLElement;
  link: HTMLAnchorElement;
} {
  const content = document.createElement("div");
  content.className = CSS_CLASSES.BLOG_CONTENT;
  const link = document.createElement("a");
  link.href = href;
  link.textContent = "IOPP";
  content.appendChild(link);
  document.body.appendChild(content);
  return { content, link };
}

function mockLinkRect(link: HTMLAnchorElement, rect: Partial<DOMRect> = {}): void {
  vi.spyOn(link, "getBoundingClientRect").mockReturnValue({
    top: 100,
    bottom: 120,
    left: 200,
    right: 250,
    width: 50,
    height: 20,
    x: 200,
    y: 100,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

describe("terminology preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    clearTerminologyDefinitionCache();
    setTerminologyPreviewContext(createMockContext());
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });
  });

  afterEach(() => {
    window.dispatchEvent(new Event("scroll"));
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
    clearTerminologyDefinitionCache();
  });

  describe("initializeTerminologyPreview", () => {
    it("binds event listeners once", () => {
      const { content } = createContentWithTermLink();
      const addSpy = vi.spyOn(content, "addEventListener");

      initializeTerminologyPreview(content);
      initializeTerminologyPreview(content);

      expect(content.dataset.terminologyPreviewBound).toBe("true");
      expect(addSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe("hover preview", () => {
    it("shows a preview card after the hover delay", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      const popup = document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW}`);
      expect(popup?.classList.contains(CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE)).toBe(true);
      expect(popup?.getAttribute("aria-hidden")).toBe("false");
      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_TITLE}`)?.textContent).toBe("IOPP");
    });

    it("hides the preview after pointer leave", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      link.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
      await vi.advanceTimersByTimeAsync(100);

      const popup = document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW}`);
      expect(popup?.classList.contains(CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE)).toBe(false);
    });

    it("keeps the preview open when moving pointer into the popup", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      const popup = document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW}`) as HTMLElement;
      link.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: popup }));
      await vi.advanceTimersByTimeAsync(100);

      expect(popup.classList.contains(CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE)).toBe(true);
    });

    it("ignores non-terminology links", async () => {
      const { content, link } = createContentWithTermLink("https://example.com");
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE}`)).toBeNull();
    });

    it("ignores pointer events outside links", async () => {
      const { content } = createContentWithTermLink();
      initializeTerminologyPreview(content);

      content.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW}`)).toBeNull();
    });
  });

  describe("focus preview", () => {
    it("shows a preview when a glossary link receives focus", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE}`)).not.toBeNull();
    });

    it("hides the preview when focus leaves the link", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);
      link.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(100);

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE}`)).toBeNull();
    });
  });

  describe("scroll and caching", () => {
    it("hides the preview immediately on scroll", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      window.dispatchEvent(new Event("scroll"));

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE}`)).toBeNull();
    });

    it("reuses cached glossary definitions", async () => {
      const context = createMockContext();
      setTerminologyPreviewContext(context);
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);
      link.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
      await vi.advanceTimersByTimeAsync(100);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(context.postLoader.loadPostContent).toHaveBeenCalledTimes(1);
    });

    it("deduplicates in-flight glossary fetches", async () => {
      let resolveLoad: (value: string) => void = () => {};
      const loadPromise = new Promise<string>((resolve) => {
        resolveLoad = resolve;
      });
      const context = createMockContext({
        postLoader: {
          loadPostContent: vi.fn().mockReturnValue(loadPromise),
        } as unknown as PostLoader,
      });
      setTerminologyPreviewContext(context);

      const { content, link: link1 } = createContentWithTermLink();
      const link2 = document.createElement("a");
      link2.href = "/zk/zk-terminology#math-term";
      link2.textContent = "Math";
      content.appendChild(link2);
      mockLinkRect(link1);
      mockLinkRect(link2);
      initializeTerminologyPreview(content);

      link1.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      link2.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(context.postLoader.loadPostContent).toHaveBeenCalledTimes(1);

      resolveLoad(glossaryMarkdown);
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(200);
    });

    it("handles glossary load failures gracefully", async () => {
      const context = createMockContext({
        postLoader: {
          loadPostContent: vi.fn().mockRejectedValue(new Error("network error")),
        } as unknown as PostLoader,
      });
      setTerminologyPreviewContext(context);
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE}`)).toBeNull();
    });

    it("does not show a preview when the glossary file is unknown", async () => {
      setTerminologyPreviewContext(
        createMockContext({
          postFiles: new Map(),
        }),
      );
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE}`)).toBeNull();
    });
  });

  describe("positioning and rendering", () => {
    it("positions the popup below the link when there is no room above", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link, { top: 4, bottom: 24 });
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      const popup = document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW}`) as HTMLElement;
      expect(Number.parseFloat(popup.style.top)).toBeGreaterThan(24);
    });

    it("typesets MathJax when the definition contains math", async () => {
      const mathjax = await import("../../src/render/mathjax");
      const typesetSpy = vi.spyOn(mathjax, "typesetMath").mockResolvedValue(undefined);

      const { content, link } = createContentWithTermLink("/zk/zk-terminology#math-term");
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(typesetSpy).toHaveBeenCalled();
    });

    it("cancels an in-flight show when the pointer moves to another link", async () => {
      const { content, link: link1 } = createContentWithTermLink("/zk/zk-terminology#iopp");
      const link2 = document.createElement("a");
      link2.href = "/zk/zk-terminology#missing-term";
      link2.textContent = "Missing";
      content.appendChild(link2);
      mockLinkRect(link1);
      mockLinkRect(link2);
      initializeTerminologyPreview(content);

      link1.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      link2.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      const title = document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_TITLE}`);
      expect(title?.textContent).not.toBe("IOPP");
    });

    it("recreates the popup when the previous element was disconnected", async () => {
      const { content, link } = createContentWithTermLink();
      mockLinkRect(link);
      initializeTerminologyPreview(content);

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      const popup = document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW}`) as HTMLElement;
      popup.remove();

      link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(document.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW}`)).not.toBeNull();
    });
  });
});
