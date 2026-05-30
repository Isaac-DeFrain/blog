/**
 * Unit tests for diagram pan/zoom behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CSS_CLASSES, DIAGRAM_LABELS } from "../../src/blog/constants";
import { attachPanZoom } from "../../src/render/diagram-pan-zoom";

async function flushAnimationFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

interface ParsedTransform {
  translateX: number;
  translateY: number;
  scale: number;
}

function parseTransform(transform: string): ParsedTransform {
  const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  const scaleMatch = transform.match(/scale\(([-\d.]+)\)/);

  if (!translateMatch || !scaleMatch) {
    throw new Error(`Unable to parse transform: ${transform}`);
  }

  return {
    translateX: Number.parseFloat(translateMatch[1]),
    translateY: Number.parseFloat(translateMatch[2]),
    scale: Number.parseFloat(scaleMatch[1]),
  };
}

function getElementSize(element: HTMLElement): { width: number; height: number } {
  return {
    width: element.clientWidth || Number.parseFloat(element.style.width) || 0,
    height: element.clientHeight || Number.parseFloat(element.style.height) || 0,
  };
}

function expectScaledCenterAtViewportCenter(
  viewport: HTMLElement,
  transform: string,
  visibleCenter: { x: number; y: number },
): void {
  const { translateX, translateY, scale } = parseTransform(transform);
  const { width: viewportWidth, height: viewportHeight } = getElementSize(viewport);

  expect(translateX + visibleCenter.x * scale).toBeCloseTo(viewportWidth / 2, 5);
  expect(translateY + visibleCenter.y * scale).toBeCloseTo(viewportHeight / 2, 5);
}

describe("attachPanZoom", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should add zoom controls and apply transforms", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.style.width = "400px";
    viewport.style.height = "300px";

    const content = document.createElement("div");
    content.innerHTML = "<svg width='200' height='100'></svg>";
    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    expect(panel.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_ZOOM_CONTROLS}`)).not.toBeNull();
    expect(content.style.transform).toContain("scale(1)");

    panel.querySelector<HTMLButtonElement>(`button[title="${DIAGRAM_LABELS.ZOOM_IN}"]`)?.click();
    expect(content.style.transform).toContain("scale(1.25)");
  });

  it("should reset zoom and pan when the reset button is clicked", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");

    viewport.style.width = "400px";
    viewport.style.height = "300px";

    const content = document.createElement("div");
    content.innerHTML = "<svg width='200' height='100'></svg>";

    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    const controller = attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    const initialTransform = content.style.transform;
    panel.querySelector<HTMLButtonElement>(`button[title="${DIAGRAM_LABELS.ZOOM_IN}"]`)?.click();
    viewport.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, button: 0, bubbles: true }));

    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 200, bubbles: true }));
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(content.style.transform).not.toBe(initialTransform);

    controller.reset();
    await flushAnimationFrame();

    expect(content.style.transform).toBe(initialTransform);
  });

  it("should center mermaid diagrams using rendered svg bounds", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.style.width = "800px";
    viewport.style.height = "600px";

    const content = document.createElement("div");
    const wrapper = document.createElement("pre");
    wrapper.className = CSS_CLASSES.MERMAID;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 400 300");
    svg.style.width = "400px";
    svg.style.height = "300px";

    wrapper.appendChild(svg);
    content.appendChild(wrapper);
    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    expect(content.style.transform).toBe("translate(0px, 0px) scale(2)");
  });

  it("should defer centering until the viewport has dimensions", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    const content = document.createElement("div");
    content.innerHTML = "<svg style='width: 200px; height: 100px'></svg>";

    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    let viewportWidth = 0;
    let viewportHeight = 0;

    Object.defineProperty(viewport, "clientWidth", {
      configurable: true,
      get: () => viewportWidth,
    });

    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      get: () => viewportHeight,
    });

    attachPanZoom(viewport, content, panel);
    viewportWidth = 400;
    viewportHeight = 300;
    await flushAnimationFrame();

    expect(content.style.transform).toBe("translate(0px, 50px) scale(2)");
  });

  it("should center graphviz diagrams on transformed graph content", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.style.width = "400px";
    viewport.style.height = "300px";

    const content = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 89 188");
    svg.style.width = "89px";
    svg.style.height = "188px";

    const graphGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    graphGroup.setAttribute("class", "graph");
    graphGroup.setAttribute("transform", "translate(4 184)");

    svg.appendChild(graphGroup);
    wrapper.appendChild(svg);
    content.appendChild(wrapper);
    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    vi.spyOn(graphGroup, "getBBox").mockReturnValue({
      x: 0,
      y: -180,
      width: 81,
      height: 180,
      top: -180,
      left: 0,
      right: 81,
      bottom: 0,
      toJSON: () => ({}),
    } as DOMRect);

    vi.spyOn(graphGroup, "getCTM").mockReturnValue({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 4,
      f: 184,
      multiply: () => ({}) as DOMMatrix,
      inverse: () => ({}) as DOMMatrix,
      translate: () => ({}) as DOMMatrix,
      scale: () => ({}) as DOMMatrix,
      rotate: () => ({}) as DOMMatrix,
      rotateFromVector: () => ({}) as DOMMatrix,
      flipX: () => ({}) as DOMMatrix,
      flipY: () => ({}) as DOMMatrix,
      skewX: () => ({}) as DOMMatrix,
      skewY: () => ({}) as DOMMatrix,
      transformPoint: (point: DOMPointInit) => new DOMPoint((point.x ?? 0) + 4, (point.y ?? 0) + 184),
    } as DOMMatrix);

    attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    expect(content.style.transform).toBe("translate(128.98936170212767px, 0px) scale(1.5957446808510638)");
  });

  it("should center on visible svg content instead of the full canvas", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.style.width = "400px";
    viewport.style.height = "300px";

    const content = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 500 500");
    svg.style.width = "500px";
    svg.style.height = "500px";

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "100");
    circle.setAttribute("cy", "100");
    circle.setAttribute("r", "20");

    svg.appendChild(circle);
    content.appendChild(svg);
    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    vi.spyOn(svg, "getBBox").mockReturnValue({
      x: 80,
      y: 80,
      width: 40,
      height: 40,
      top: 80,
      left: 80,
      right: 120,
      bottom: 120,
      toJSON: () => ({}),
    } as DOMRect);

    attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    expect(content.style.transform).toBe("translate(140px, 90px) scale(0.6)");
  });

  it("should upscale small diagrams up to 2x when they fit in the viewport", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.style.width = "400px";
    viewport.style.height = "300px";

    const content = document.createElement("div");
    content.innerHTML = "<svg style='width: 100px; height: 100px'></svg>";
    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    expect(content.style.transform).toContain("scale(2)");
  });

  it("should scale down oversized diagrams to fit the viewport", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.style.width = "400px";
    viewport.style.height = "300px";

    const content = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = "800px";
    svg.style.height = "600px";

    content.appendChild(svg);
    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    expect(content.style.transform).toBe("translate(0px, 0px) scale(0.5)");
  });

  it("should restore fit and center on reset for oversized diagrams", async () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.style.width = "400px";
    viewport.style.height = "300px";

    const content = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = "800px";
    svg.style.height = "600px";

    content.appendChild(svg);
    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    const controller = attachPanZoom(viewport, content, panel);
    await flushAnimationFrame();

    const initialTransform = content.style.transform;
    panel.querySelector<HTMLButtonElement>(`button[title="${DIAGRAM_LABELS.ZOOM_IN}"]`)?.click();

    controller.reset();
    await flushAnimationFrame();

    expect(content.style.transform).toBe(initialTransform);
  });

  it("should remove listeners and controls on destroy", () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    const content = document.createElement("div");

    viewport.appendChild(content);
    panel.appendChild(viewport);
    document.body.appendChild(panel);

    const controller = attachPanZoom(viewport, content, panel);
    controller.destroy();

    expect(panel.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_ZOOM_CONTROLS}`)).toBeNull();
    expect(content.style.transform).toBe("");
  });

  describe("initial centering", () => {
    it("should place a 2x upscaled diagram center at the viewport center", async () => {
      const panel = document.createElement("div");
      const viewport = document.createElement("div");
      viewport.style.width = "400px";
      viewport.style.height = "300px";

      const content = document.createElement("div");
      content.innerHTML = "<svg style='width: 100px; height: 100px'></svg>";
      viewport.appendChild(content);
      panel.appendChild(viewport);
      document.body.appendChild(panel);

      attachPanZoom(viewport, content, panel);
      await flushAnimationFrame();

      expectScaledCenterAtViewportCenter(viewport, content.style.transform, { x: 50, y: 50 });
      expect(parseTransform(content.style.transform).scale).toBe(2);
    });

    it("should place a scaled-down diagram center at the viewport center", async () => {
      const panel = document.createElement("div");
      const viewport = document.createElement("div");
      viewport.style.width = "400px";
      viewport.style.height = "300px";

      const content = document.createElement("div");
      content.innerHTML = "<svg style='width: 800px; height: 600px'></svg>";
      viewport.appendChild(content);
      panel.appendChild(viewport);
      document.body.appendChild(panel);

      attachPanZoom(viewport, content, panel);
      await flushAnimationFrame();

      expectScaledCenterAtViewportCenter(viewport, content.style.transform, { x: 400, y: 300 });
      expect(parseTransform(content.style.transform).scale).toBe(0.5);
    });

    it("should place an asymmetric 2x upscaled diagram center at the viewport center", async () => {
      const panel = document.createElement("div");
      const viewport = document.createElement("div");
      viewport.style.width = "400px";
      viewport.style.height = "300px";

      const content = document.createElement("div");
      content.innerHTML = "<svg style='width: 200px; height: 100px'></svg>";
      viewport.appendChild(content);
      panel.appendChild(viewport);
      document.body.appendChild(panel);

      attachPanZoom(viewport, content, panel);
      await flushAnimationFrame();

      expectScaledCenterAtViewportCenter(viewport, content.style.transform, { x: 100, y: 50 });
      expect(parseTransform(content.style.transform).scale).toBe(2);
    });

    it("should place visible svg content center at the viewport center", async () => {
      const panel = document.createElement("div");
      const viewport = document.createElement("div");
      viewport.style.width = "400px";
      viewport.style.height = "300px";

      const content = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 500 500");
      svg.style.width = "500px";
      svg.style.height = "500px";

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "100");
      circle.setAttribute("cy", "100");
      circle.setAttribute("r", "20");

      svg.appendChild(circle);
      content.appendChild(svg);
      viewport.appendChild(content);
      panel.appendChild(viewport);
      document.body.appendChild(panel);

      vi.spyOn(svg, "getBBox").mockReturnValue({
        x: 80,
        y: 80,
        width: 40,
        height: 40,
        top: 80,
        left: 80,
        right: 120,
        bottom: 120,
        toJSON: () => ({}),
      } as DOMRect);

      attachPanZoom(viewport, content, panel);
      await flushAnimationFrame();

      expectScaledCenterAtViewportCenter(viewport, content.style.transform, { x: 100, y: 100 });
    });

    it("should place a mermaid diagram center at the viewport center when upscaled to 2x", async () => {
      const panel = document.createElement("div");
      const viewport = document.createElement("div");
      viewport.style.width = "800px";
      viewport.style.height = "600px";

      const content = document.createElement("div");
      const wrapper = document.createElement("pre");
      wrapper.className = CSS_CLASSES.MERMAID;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 400 300");
      svg.style.width = "400px";
      svg.style.height = "300px";

      wrapper.appendChild(svg);
      content.appendChild(wrapper);
      viewport.appendChild(content);
      panel.appendChild(viewport);
      document.body.appendChild(panel);

      attachPanZoom(viewport, content, panel);
      await flushAnimationFrame();

      expectScaledCenterAtViewportCenter(viewport, content.style.transform, { x: 200, y: 150 });
      expect(parseTransform(content.style.transform).scale).toBe(2);
    });

    it("should place graphviz graph content center at the viewport center", async () => {
      const panel = document.createElement("div");
      const viewport = document.createElement("div");
      viewport.style.width = "400px";
      viewport.style.height = "300px";

      const content = document.createElement("div");
      const wrapper = document.createElement("div");
      wrapper.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 89 188");
      svg.style.width = "89px";
      svg.style.height = "188px";

      const graphGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      graphGroup.setAttribute("class", "graph");
      graphGroup.setAttribute("transform", "translate(4 184)");

      svg.appendChild(graphGroup);
      wrapper.appendChild(svg);
      content.appendChild(wrapper);
      viewport.appendChild(content);
      panel.appendChild(viewport);
      document.body.appendChild(panel);

      vi.spyOn(graphGroup, "getBBox").mockReturnValue({
        x: 0,
        y: -180,
        width: 81,
        height: 180,
        top: -180,
        left: 0,
        right: 81,
        bottom: 0,
        toJSON: () => ({}),
      } as DOMRect);

      vi.spyOn(graphGroup, "getCTM").mockReturnValue({
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 4,
        f: 184,
        multiply: () => ({}) as DOMMatrix,
        inverse: () => ({}) as DOMMatrix,
        translate: () => ({}) as DOMMatrix,
        scale: () => ({}) as DOMMatrix,
        rotate: () => ({}) as DOMMatrix,
        rotateFromVector: () => ({}) as DOMMatrix,
        flipX: () => ({}) as DOMMatrix,
        flipY: () => ({}) as DOMMatrix,
        skewX: () => ({}) as DOMMatrix,
        skewY: () => ({}) as DOMMatrix,
        transformPoint: (point: DOMPointInit) => new DOMPoint((point.x ?? 0) + 4, (point.y ?? 0) + 184),
      } as DOMMatrix);

      attachPanZoom(viewport, content, panel);
      await flushAnimationFrame();

      const { translateX, translateY, scale } = parseTransform(content.style.transform);
      const { width: viewportWidth, height: viewportHeight } = getElementSize(viewport);
      const visibleCenterX = (viewportWidth / 2 - translateX) / scale;
      const visibleCenterY = (viewportHeight / 2 - translateY) / scale;

      expect(translateX + visibleCenterX * scale).toBeCloseTo(viewportWidth / 2, 5);
      expect(translateY + visibleCenterY * scale).toBeCloseTo(viewportHeight / 2, 5);
    });
  });
});
