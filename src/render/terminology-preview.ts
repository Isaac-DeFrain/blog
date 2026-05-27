/**
 * @module render/terminology-preview
 *
 * Hover/focus preview cards for links to terminology glossary terms.
 */

import type { PostLoader } from "../blog/post-loader";
import type { PostRenderer } from "../blog/post-renderer";
import type { HighlightConfig } from "../blog/types";
import { CSS_CLASSES } from "../blog/constants";
import { ContentFeatureDetector } from "./content-features";
import { createElement, appendChildren } from "../utils/dom";
import { parseTerminologyDefinitions, resolveTerminologyLink, type TermDefinition } from "../utils/terminology";

/** Delay before showing preview (ms) */
const SHOW_DELAY_MS = 200;

/** Delay before hiding preview (ms) */
const HIDE_DELAY_MS = 100;

/**
 * Context required to resolve and render terminology previews.
 */
export interface TerminologyPreviewContext {
  basePath: string;
  currentPostId: string | null;
  terminologyPostIds: Set<string>;
  postLoader: PostLoader;
  postRenderer: PostRenderer;
  postFiles: Map<string, string>;
  getHighlightConfig: () => Promise<HighlightConfig>;
}

let previewContext: TerminologyPreviewContext | null = null;
let popupElement: HTMLElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let activeLink: HTMLAnchorElement | null = null;

/** Cache of parsed glossary definitions keyed by post ID */
const definitionCache = new Map<string, Map<string, TermDefinition>>();

/** In-flight glossary fetches keyed by post ID */
const fetchPromises = new Map<string, Promise<Map<string, TermDefinition>>>();

/**
 * Updates the active terminology preview context (called on each content render).
 */
export function setTerminologyPreviewContext(context: TerminologyPreviewContext): void {
  previewContext = context;
}

/**
 * Clears cached glossary definitions (e.g. when posts reload).
 */
export function clearTerminologyDefinitionCache(): void {
  definitionCache.clear();
  fetchPromises.clear();
}

/**
 * Initializes hover/focus preview behavior on blog content.
 */
export function initializeTerminologyPreview(contentElement: HTMLElement): void {
  if (contentElement.dataset.terminologyPreviewBound === "true") {
    return;
  }

  contentElement.dataset.terminologyPreviewBound = "true";
  contentElement.addEventListener("mouseover", handlePointerOver);
  contentElement.addEventListener("mouseout", handlePointerOut);
  contentElement.addEventListener("focusin", handleFocusIn);
  contentElement.addEventListener("focusout", handleFocusOut);

  window.addEventListener("scroll", hidePreviewImmediately, true);
}

async function loadDefinitions(postId: string, file: string): Promise<Map<string, TermDefinition>> {
  const cached = definitionCache.get(postId);
  if (cached) {
    return cached;
  }

  const inFlight = fetchPromises.get(postId);
  if (inFlight) {
    return inFlight;
  }

  if (!previewContext) {
    return new Map();
  }

  const promise = previewContext.postLoader
    .loadPostContent(previewContext.basePath, file)
    .then((markdown) => {
      const definitions = parseTerminologyDefinitions(markdown);
      definitionCache.set(postId, definitions);
      fetchPromises.delete(postId);
      return definitions;
    })
    .catch(() => {
      fetchPromises.delete(postId);
      return new Map<string, TermDefinition>();
    });

  fetchPromises.set(postId, promise);
  return promise;
}

function getPostFile(postId: string): string | null {
  if (!previewContext) {
    return null;
  }

  return previewContext.postFiles.get(postId) ?? null;
}

async function getDefinition(postId: string, termId: string): Promise<TermDefinition | null> {
  let definitions = definitionCache.get(postId);
  if (!definitions) {
    const file = getPostFile(postId);
    if (!file) {
      return null;
    }

    definitions = await loadDefinitions(postId, file);
  }

  return definitions.get(termId) ?? null;
}

function ensurePopup(): HTMLElement {
  if (popupElement?.isConnected) {
    return popupElement;
  }

  const title = createElement("div", { className: CSS_CLASSES.TERMINOLOGY_PREVIEW_TITLE });
  const body = createElement("div", {
    className: `${CSS_CLASSES.TERMINOLOGY_PREVIEW_BODY} ${CSS_CLASSES.BLOG_CONTENT}`,
  });

  popupElement = createElement("div", {
    className: CSS_CLASSES.TERMINOLOGY_PREVIEW,
    attributes: { role: "tooltip", "aria-hidden": "true" },
  });

  appendChildren(popupElement, [title, body]);
  document.body.appendChild(popupElement);

  return popupElement;
}

function hidePreviewImmediately(): void {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  activeLink = null;
  if (popupElement) {
    popupElement.classList.remove(CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE);
    popupElement.setAttribute("aria-hidden", "true");
  }
}

function scheduleHide(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }

  hideTimer = setTimeout(() => {
    hidePreviewImmediately();
  }, HIDE_DELAY_MS);
}

function cancelHide(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function positionPopup(link: HTMLAnchorElement, popup: HTMLElement): void {
  const linkRect = link.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const margin = 8;

  let top = linkRect.top - popupRect.height - margin;
  if (top < margin) {
    top = linkRect.bottom + margin;
  }

  let left = linkRect.left + linkRect.width / 2 - popupRect.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - popupRect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - popupRect.height - margin));

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
}

async function showPreview(link: HTMLAnchorElement, target: { postId: string; termId: string }): Promise<void> {
  if (!previewContext) {
    return;
  }

  const definition = await getDefinition(target.postId, target.termId);
  if (!definition || activeLink !== link) {
    return;
  }

  const popup = ensurePopup();
  const titleEl = popup.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_TITLE}`) as HTMLElement;
  const bodyEl = popup.querySelector(`.${CSS_CLASSES.TERMINOLOGY_PREVIEW_BODY}`) as HTMLElement;
  titleEl.textContent = definition.title;

  const highlightConfig = await previewContext.getHighlightConfig();
  const html = await previewContext.postRenderer.processMarkdown(definition.bodyMarkdown, highlightConfig);
  bodyEl.innerHTML = html;

  if (ContentFeatureDetector.needsMathJax(definition.bodyMarkdown)) {
    const mathjax = await import("./mathjax");
    await mathjax.typesetMath(bodyEl);
  }

  popup.classList.add(CSS_CLASSES.TERMINOLOGY_PREVIEW_VISIBLE);
  popup.setAttribute("aria-hidden", "false");
  positionPopup(link, popup);
}

function scheduleShow(link: HTMLAnchorElement): void {
  if (!previewContext) {
    return;
  }

  const href = link.getAttribute("href") ?? link.href;
  const target = resolveTerminologyLink(
    href,
    previewContext.basePath,
    previewContext.currentPostId,
    previewContext.terminologyPostIds,
  );

  if (!target) {
    return;
  }

  if (showTimer) {
    clearTimeout(showTimer);
  }

  cancelHide();
  activeLink = link;

  showTimer = setTimeout(() => {
    showTimer = null;
    void showPreview(link, target);
  }, SHOW_DELAY_MS);
}

function handlePointerOver(event: MouseEvent): void {
  const link = (event.target as HTMLElement).closest("a");
  if (!link || !(event.currentTarget as Node).contains(link)) {
    return;
  }

  scheduleShow(link);
}

function handlePointerOut(event: MouseEvent): void {
  const link = (event.target as HTMLElement).closest("a");
  if (!link) {
    return;
  }

  const related = event.relatedTarget as Node | null;
  if (related && (link.contains(related) || popupElement?.contains(related))) {
    return;
  }

  scheduleHide();
}

function handleFocusIn(event: FocusEvent): void {
  const link = (event.target as HTMLElement).closest("a");
  if (!link || !(event.currentTarget as Node).contains(link)) {
    return;
  }

  scheduleShow(link);
}

function handleFocusOut(_event: FocusEvent): void {
  scheduleHide();
}
