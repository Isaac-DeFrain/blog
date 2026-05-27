/**
 * Utilities for opening rendered diagrams in an in-page modal.
 */

import { CSS_CLASSES, DIAGRAM_LABELS } from "../blog/constants";
import { appendChildren, createElement } from "../utils/dom";
import { attachPanZoom, type PanZoomController } from "./diagram-pan-zoom";

const DIAGRAM_CLICK_ENABLED = "diagramClickEnabled";

let modalRoot: HTMLElement | null = null;
let viewportHost: HTMLElement | null = null;
let zoomContentHost: HTMLElement | null = null;
let contentHost: HTMLElement | null = null;
let closeButton: HTMLButtonElement | null = null;
let previousFocus: HTMLElement | null = null;
let escapeHandler: ((event: KeyboardEvent) => void) | null = null;
let panZoomController: PanZoomController | null = null;
let panelHost: HTMLElement | null = null;

/**
 * Returns the wrapper class used to preserve diagram styling in the modal.
 */
function getDiagramWrapperClass(container: HTMLElement): string {
  if (container.classList.contains(CSS_CLASSES.MERMAID)) {
    return CSS_CLASSES.MERMAID;
  }

  return CSS_CLASSES.GRAPHVIZ_CONTAINER;
}

/**
 * Clones a diagram SVG using its rendered size from the page.
 */
function cloneDiagramForModal(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const { width, height } = svg.getBoundingClientRect();

  if (width > 0 && height > 0) {
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
  }

  return clone;
}

/**
 * Creates the shared diagram modal if it does not already exist.
 */
function ensureModal(): HTMLElement {
  if (modalRoot?.isConnected && viewportHost && zoomContentHost && contentHost && closeButton && panelHost) {
    return modalRoot;
  }

  modalRoot = null;
  viewportHost = null;
  zoomContentHost = null;
  contentHost = null;
  closeButton = null;
  panelHost = null;

  const backdrop = createElement("div", { className: CSS_CLASSES.DIAGRAM_MODAL_BACKDROP });
  closeButton = createElement("button", {
    className: CSS_CLASSES.DIAGRAM_MODAL_CLOSE,
    textContent: "×",
    attributes: {
      type: "button",
      "aria-label": DIAGRAM_LABELS.CLOSE,
    },
  }) as HTMLButtonElement;

  contentHost = createElement("div", {
    className: `${CSS_CLASSES.DIAGRAM_MODAL_CONTENT} ${CSS_CLASSES.BLOG_CONTENT}`,
  });

  zoomContentHost = createElement("div", { className: CSS_CLASSES.DIAGRAM_MODAL_ZOOM_CONTENT });
  zoomContentHost.appendChild(contentHost);

  viewportHost = createElement("div", { className: CSS_CLASSES.DIAGRAM_MODAL_VIEWPORT });
  viewportHost.appendChild(zoomContentHost);

  panelHost = createElement("div", { className: CSS_CLASSES.DIAGRAM_MODAL_PANEL });
  appendChildren(panelHost, [closeButton, viewportHost]);

  modalRoot = createElement("div", {
    className: CSS_CLASSES.DIAGRAM_MODAL,
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-hidden": "true",
      "aria-label": DIAGRAM_LABELS.MODAL_TITLE,
    },
  });
  appendChildren(modalRoot, [backdrop, panelHost]);

  backdrop.addEventListener("click", closeDiagramModal);
  closeButton.addEventListener("click", closeDiagramModal);
  document.body.appendChild(modalRoot);

  return modalRoot;
}

/**
 * Shows a rendered diagram in the in-page modal.
 *
 * @param svg - The SVG element to display
 * @param container - The diagram container element
 */
export function showDiagramModal(svg: SVGSVGElement, container: HTMLElement): void {
  const modal = ensureModal();
  if (!contentHost || !closeButton || !viewportHost || !zoomContentHost || !panelHost) {
    return;
  }

  panZoomController?.destroy();
  panZoomController = null;

  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  contentHost.replaceChildren();
  const wrapperClass = getDiagramWrapperClass(container);
  const wrapperTag = wrapperClass === CSS_CLASSES.MERMAID ? "pre" : "div";
  const wrapper = createElement(wrapperTag, { className: wrapperClass });
  wrapper.appendChild(cloneDiagramForModal(svg));
  contentHost.appendChild(wrapper);

  modal.classList.add(CSS_CLASSES.DIAGRAM_MODAL_VISIBLE);
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add(CSS_CLASSES.DIAGRAM_MODAL_OPEN);

  panZoomController = attachPanZoom(viewportHost, zoomContentHost, panelHost);

  escapeHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeDiagramModal();
    }
  };
  document.addEventListener("keydown", escapeHandler);
  closeButton.focus();
}

/**
 * Closes the diagram modal if it is open.
 */
export function closeDiagramModal(): void {
  if (!modalRoot || !contentHost) {
    return;
  }

  panZoomController?.destroy();
  panZoomController = null;

  modalRoot.classList.remove(CSS_CLASSES.DIAGRAM_MODAL_VISIBLE);
  modalRoot.setAttribute("aria-hidden", "true");
  document.body.classList.remove(CSS_CLASSES.DIAGRAM_MODAL_OPEN);
  contentHost.replaceChildren();

  if (escapeHandler) {
    document.removeEventListener("keydown", escapeHandler);
    escapeHandler = null;
  }

  previousFocus?.focus();
  previousFocus = null;
}

/**
 * Makes a rendered diagram container open in the modal when clicked.
 *
 * @param container - The diagram container element
 */
export function enableDiagramClickToOpen(container: HTMLElement): void {
  if (container.dataset[DIAGRAM_CLICK_ENABLED] === "true") {
    return;
  }

  const svg = container.querySelector("svg");
  if (!svg) {
    return;
  }

  container.classList.add(CSS_CLASSES.DIAGRAM_CLICKABLE);
  container.setAttribute("role", "button");
  container.setAttribute("tabindex", "0");
  container.setAttribute("title", DIAGRAM_LABELS.OPEN_DIAGRAM);
  container.dataset[DIAGRAM_CLICK_ENABLED] = "true";

  const openDiagram = (): void => {
    showDiagramModal(svg, container);
  };

  container.addEventListener("click", openDiagram);
  container.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDiagram();
    }
  });
}

/**
 * Makes multiple rendered diagram containers open in the modal when clicked.
 *
 * @param elements - Diagram container element(s)
 */
export function enableDiagramClickToOpenOnElements(elements: HTMLElement | HTMLElement[]): void {
  const elementsArray = Array.isArray(elements) ? elements : [elements];

  for (const element of elementsArray) {
    enableDiagramClickToOpen(element);
  }
}
