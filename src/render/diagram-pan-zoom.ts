/**
 * Pan and zoom controls for diagram viewports.
 */

import { DIAGRAM_LABELS, CSS_CLASSES } from "../blog/constants";
import { appendChildren, createElement } from "../utils/dom";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const INITIAL_MAX_SCALE = 2;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_FACTOR = 0.001;

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface PanZoomController {
  reset: () => void;
  destroy: () => void;
}

/**
 * Transforms a local bounding box into the root SVG user coordinate space.
 */
function transformBBoxToRootSvgSpace(element: SVGGraphicsElement, bbox: DOMRect): DOMRect {
  if (element instanceof SVGSVGElement) {
    return bbox;
  }

  const matrix = element.getCTM();
  if (!matrix) {
    return bbox;
  }

  const corners = [
    new DOMPoint(bbox.x, bbox.y),
    new DOMPoint(bbox.x + bbox.width, bbox.y),
    new DOMPoint(bbox.x, bbox.y + bbox.height),
    new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height),
  ].map((point) => point.matrixTransform(matrix));

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return new DOMRect(minX, minY, maxX - minX, maxY - minY);
}

/**
 * Returns the bounding box of visible SVG diagram content in root SVG coordinates.
 */
function getSvgContentBBox(svg: SVGSVGElement): DOMRect | null {
  const candidates: SVGGraphicsElement[] = [];
  const graphGroup = svg.querySelector("g.graph");
  if (graphGroup instanceof SVGGraphicsElement) {
    candidates.push(graphGroup);
  }

  const firstGroup = svg.querySelector("g");
  if (firstGroup instanceof SVGGraphicsElement && firstGroup !== graphGroup) {
    candidates.push(firstGroup);
  }

  candidates.push(svg);

  for (const element of candidates) {
    try {
      const localBBox = element.getBBox();
      if (localBBox.width > 0 && localBBox.height > 0) {
        return transformBBoxToRootSvgSpace(element, localBBox);
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Returns the rendered pixel size for an element.
 */
function getElementPixelSize(element: Element): { width: number; height: number } {
  const sizedElement = element as HTMLElement;
  const width = sizedElement.clientWidth || Number.parseFloat(sizedElement.style.width) || 0;
  const height = sizedElement.clientHeight || Number.parseFloat(sizedElement.style.height) || 0;

  return { width, height };
}

/**
 * Maps a point from SVG user space to pixel coordinates within the SVG element.
 */
function mapUserPointToSvgPixels(svg: SVGSVGElement, userX: number, userY: number): { x: number; y: number } {
  const viewBox = svg.viewBox.baseVal;
  const viewBoxWidth = viewBox.width || svg.width.baseVal.value || 1;
  const viewBoxHeight = viewBox.height || svg.height.baseVal.value || 1;
  const { width: svgWidth, height: svgHeight } = getElementPixelSize(svg);

  return {
    x: ((userX - viewBox.x) / viewBoxWidth) * svgWidth,
    y: ((userY - viewBox.y) / viewBoxHeight) * svgHeight,
  };
}

/**
 * Returns the center of an element relative to a container using rendered bounds.
 */
function getElementCenterInContainer(container: HTMLElement, element: Element): { x: number; y: number } | null {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  if (elementRect.width > 0 && elementRect.height > 0) {
    return {
      x: elementRect.left - containerRect.left + elementRect.width / 2,
      y: elementRect.top - containerRect.top + elementRect.height / 2,
    };
  }

  const { width, height } = getElementPixelSize(element);
  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: width / 2,
    y: height / 2,
  };
}

/**
 * Returns the untransformed layout size of the zoom content.
 */
function getContentDimensions(content: HTMLElement): { width: number; height: number } {
  if (content.scrollWidth > 0 && content.scrollHeight > 0) {
    return { width: content.scrollWidth, height: content.scrollHeight };
  }

  const svg = content.querySelector("svg");
  if (svg) {
    const { width, height } = getElementPixelSize(svg);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  return getElementPixelSize(content);
}

/**
 * Returns the initial display scale: up to 2×, capped by the viewport fit scale.
 */
function computeFitScale(viewport: HTMLElement, content: HTMLElement): number {
  const { width: viewportWidth, height: viewportHeight } = getElementPixelSize(viewport);
  const { width: contentWidth, height: contentHeight } = getContentDimensions(content);

  if (viewportWidth <= 0 || viewportHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return 1;
  }

  const scaleX = viewportWidth / contentWidth;
  const scaleY = viewportHeight / contentHeight;

  return Math.min(scaleX, scaleY, INITIAL_MAX_SCALE);
}

/**
 * Returns the visible diagram center relative to the zoom content container.
 */
function getVisibleCenterInContent(content: HTMLElement): { x: number; y: number } | null {
  const svg = content.querySelector("svg");
  if (!svg) {
    return null;
  }

  const mermaidWrapper = content.querySelector(`.${CSS_CLASSES.MERMAID}`);
  if (mermaidWrapper) {
    const renderedCenter = getElementCenterInContainer(content, svg);
    if (renderedCenter) {
      return renderedCenter;
    }
  }

  const bbox = getSvgContentBBox(svg);
  if (!bbox) {
    const styledCenter = getElementCenterInContainer(content, svg);
    if (styledCenter) {
      return styledCenter;
    }

    return {
      x: content.scrollWidth / 2,
      y: content.scrollHeight / 2,
    };
  }

  const centerInSvg = mapUserPointToSvgPixels(svg, bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
  const contentRect = content.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();

  return {
    x: svgRect.left - contentRect.left + centerInSvg.x,
    y: svgRect.top - contentRect.top + centerInSvg.y,
  };
}

/**
 * Attaches pan and zoom interaction to a diagram viewport.
 */
export function attachPanZoom(
  viewport: HTMLElement,
  content: HTMLElement,
  controlsParent: HTMLElement,
): PanZoomController {
  content.style.transformOrigin = "0 0";

  const state: ZoomState = {
    scale: 1,
    translateX: 0,
    translateY: 0,
  };

  let centerAnimationFrame = 0;
  let initialView: Pick<ZoomState, "scale" | "translateX" | "translateY"> | null = null;

  const applyTransform = (): void => {
    content.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
  };

  const clampScale = (scale: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

  const fitAndCenterContent = (): void => {
    content.style.transform = "none";

    state.scale = computeFitScale(viewport, content);

    const visibleCenter = getVisibleCenterInContent(content);
    const { width: viewportWidth, height: viewportHeight } = getElementPixelSize(viewport);

    if (visibleCenter) {
      state.translateX = viewportWidth / 2 - visibleCenter.x * state.scale;
      state.translateY = viewportHeight / 2 - visibleCenter.y * state.scale;
    } else {
      const { width: contentWidth, height: contentHeight } = getContentDimensions(content);
      state.translateX = (viewportWidth - contentWidth * state.scale) / 2;
      state.translateY = (viewportHeight - contentHeight * state.scale) / 2;
    }

    applyTransform();
    initialView = {
      scale: state.scale,
      translateX: state.translateX,
      translateY: state.translateY,
    };
  };

  const scheduleFitAndCenterContent = (): void => {
    if (centerAnimationFrame) {
      cancelAnimationFrame(centerAnimationFrame);
    }

    let attempts = 0;
    const tryFitAndCenter = (): void => {
      const { width: viewportWidth, height: viewportHeight } = getElementPixelSize(viewport);

      if (viewportWidth > 0 && viewportHeight > 0) {
        centerAnimationFrame = 0;
        fitAndCenterContent();
        return;
      }

      attempts += 1;
      if (attempts < 10) {
        centerAnimationFrame = requestAnimationFrame(tryFitAndCenter);
      } else {
        centerAnimationFrame = 0;
        fitAndCenterContent();
      }
    };

    centerAnimationFrame = requestAnimationFrame(tryFitAndCenter);
  };

  const zoomAtPoint = (nextScale: number, clientX: number, clientY: number): void => {
    const clampedScale = clampScale(nextScale);
    if (clampedScale === state.scale) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const pointX = clientX - rect.left;
    const pointY = clientY - rect.top;
    const scaleRatio = clampedScale / state.scale;

    state.translateX = pointX - (pointX - state.translateX) * scaleRatio;
    state.translateY = pointY - (pointY - state.translateY) * scaleRatio;
    state.scale = clampedScale;

    applyTransform();
  };

  const reset = (): void => {
    if (centerAnimationFrame) {
      cancelAnimationFrame(centerAnimationFrame);
      centerAnimationFrame = 0;
    }

    if (initialView) {
      state.scale = initialView.scale;
      state.translateX = initialView.translateX;
      state.translateY = initialView.translateY;
      applyTransform();
      return;
    }

    content.style.transform = "none";
    scheduleFitAndCenterContent();
  };

  const controls = createElement("div", {
    className: CSS_CLASSES.DIAGRAM_MODAL_ZOOM_CONTROLS,
    attributes: { role: "toolbar", "aria-label": "Diagram zoom controls" },
  });

  const zoomInButton = createZoomButton(DIAGRAM_LABELS.ZOOM_IN, "+", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAtPoint(state.scale + ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  const zoomOutButton = createZoomButton(DIAGRAM_LABELS.ZOOM_OUT, "−", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAtPoint(state.scale - ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  const resetButton = createZoomButton(DIAGRAM_LABELS.ZOOM_RESET, "↺", reset);

  appendChildren(controls, [zoomInButton, zoomOutButton, resetButton]);
  controlsParent.appendChild(controls);

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const nextScale = state.scale * (1 - event.deltaY * WHEEL_ZOOM_FACTOR);
    zoomAtPoint(nextScale, event.clientX, event.clientY);
  };

  viewport.addEventListener("wheel", onWheel, { passive: false });

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;

  const onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = state.translateX;
    dragOriginY = state.translateY;

    viewport.classList.add(CSS_CLASSES.DIAGRAM_MODAL_DRAGGING);
    event.preventDefault();
  };

  const onMouseMove = (event: MouseEvent): void => {
    if (!isDragging) {
      return;
    }

    state.translateX = dragOriginX + (event.clientX - dragStartX);
    state.translateY = dragOriginY + (event.clientY - dragStartY);

    applyTransform();
  };

  const onMouseUp = (): void => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    viewport.classList.remove(CSS_CLASSES.DIAGRAM_MODAL_DRAGGING);
  };

  viewport.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  scheduleFitAndCenterContent();

  return {
    reset,
    destroy: () => {
      if (centerAnimationFrame) {
        cancelAnimationFrame(centerAnimationFrame);
        centerAnimationFrame = 0;
      }

      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      controls.remove();
      content.style.transform = "";
    },
  };
}

function createZoomButton(label: string, text: string, onClick: () => void): HTMLButtonElement {
  const button = createElement("button", {
    className: CSS_CLASSES.DIAGRAM_MODAL_ZOOM_BUTTON,
    textContent: text,
    attributes: {
      type: "button",
      "aria-label": label,
      title: label,
    },
  }) as HTMLButtonElement;

  button.addEventListener("click", onClick);
  return button;
}
