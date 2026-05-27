/**
 * Unit tests for diagram modal behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CSS_CLASSES } from "../../src/blog/constants";
import { closeDiagramModal, enableDiagramClickToOpen, showDiagramModal } from "../../src/render/diagram-popup";

describe("diagram popup", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    closeDiagramModal();
  });

  afterEach(() => {
    closeDiagramModal();
  });

  describe("enableDiagramClickToOpen", () => {
    it("should mark diagram containers as clickable", () => {
      const container = document.createElement("div");
      container.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;
      container.innerHTML = "<svg></svg>";
      document.body.appendChild(container);

      enableDiagramClickToOpen(container);

      expect(container.classList.contains(CSS_CLASSES.DIAGRAM_CLICKABLE)).toBe(true);
      expect(container.getAttribute("role")).toBe("button");
      expect(container.getAttribute("tabindex")).toBe("0");
    });

    it("should not modify containers without svg content", () => {
      const container = document.createElement("div");
      container.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;
      document.body.appendChild(container);

      enableDiagramClickToOpen(container);

      expect(container.classList.contains(CSS_CLASSES.DIAGRAM_CLICKABLE)).toBe(false);
    });

    it("should not attach handlers twice", () => {
      const container = document.createElement("div");
      container.className = CSS_CLASSES.MERMAID;
      container.innerHTML = "<svg></svg>";
      document.body.appendChild(container);

      enableDiagramClickToOpen(container);
      enableDiagramClickToOpen(container);

      container.click();
      container.click();

      expect(document.querySelectorAll(`.${CSS_CLASSES.DIAGRAM_MODAL_CONTENT} svg`).length).toBe(1);
    });

    it("should open the modal when clicked", () => {
      const container = document.createElement("pre");
      container.className = CSS_CLASSES.MERMAID;
      container.innerHTML = "<svg></svg>";
      document.body.appendChild(container);

      enableDiagramClickToOpen(container);
      container.click();

      const modal = document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL}`);
      expect(modal?.classList.contains(CSS_CLASSES.DIAGRAM_MODAL_VISIBLE)).toBe(true);
      expect(document.body.classList.contains(CSS_CLASSES.DIAGRAM_MODAL_OPEN)).toBe(true);
      expect(
        document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_CONTENT} .${CSS_CLASSES.MERMAID} svg`),
      ).not.toBeNull();
    });

    it("should open the modal when activated with Enter", () => {
      const container = document.createElement("div");
      container.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;
      container.innerHTML = "<svg></svg>";
      document.body.appendChild(container);

      enableDiagramClickToOpen(container);
      container.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      expect(
        document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL}.${CSS_CLASSES.DIAGRAM_MODAL_VISIBLE}`),
      ).not.toBeNull();
      expect(
        document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_CONTENT} .${CSS_CLASSES.GRAPHVIZ_CONTAINER} svg`),
      ).not.toBeNull();
    });
  });

  describe("showDiagramModal", () => {
    it("should preserve graphviz styling wrapper in the modal", () => {
      const container = document.createElement("div");
      container.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.appendChild(svg);
      document.body.appendChild(container);

      showDiagramModal(svg, container);

      expect(
        document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_CONTENT}.${CSS_CLASSES.BLOG_CONTENT}`),
      ).not.toBeNull();
      expect(
        document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_CONTENT} .${CSS_CLASSES.GRAPHVIZ_CONTAINER} svg`),
      ).not.toBeNull();
    });

    it("should close when Escape is pressed", () => {
      const container = document.createElement("pre");
      container.className = CSS_CLASSES.MERMAID;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.appendChild(svg);
      document.body.appendChild(container);

      showDiagramModal(svg, container);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL}.${CSS_CLASSES.DIAGRAM_MODAL_VISIBLE}`)).toBeNull();
      expect(document.body.classList.contains(CSS_CLASSES.DIAGRAM_MODAL_OPEN)).toBe(false);
    });

    it("should close when the close button is clicked", () => {
      const container = document.createElement("pre");
      container.className = CSS_CLASSES.MERMAID;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.appendChild(svg);
      document.body.appendChild(container);

      showDiagramModal(svg, container);
      document.querySelector<HTMLButtonElement>(`.${CSS_CLASSES.DIAGRAM_MODAL_CLOSE}`)?.click();

      expect(document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL}.${CSS_CLASSES.DIAGRAM_MODAL_VISIBLE}`)).toBeNull();
    });

    it("should close when the backdrop is clicked", () => {
      const container = document.createElement("pre");
      container.className = CSS_CLASSES.MERMAID;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.appendChild(svg);
      document.body.appendChild(container);

      showDiagramModal(svg, container);
      document
        .querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_BACKDROP}`)
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL}.${CSS_CLASSES.DIAGRAM_MODAL_VISIBLE}`)).toBeNull();
    });

    it("should include pan and zoom controls in the modal", () => {
      const container = document.createElement("div");
      container.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      container.appendChild(svg);
      document.body.appendChild(container);

      showDiagramModal(svg, container);

      expect(document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_VIEWPORT}`)).not.toBeNull();
      expect(document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_ZOOM_CONTENT}`)).not.toBeNull();
      expect(document.querySelectorAll(`.${CSS_CLASSES.DIAGRAM_MODAL_ZOOM_BUTTON}`).length).toBe(3);
    });

    it("should preserve the rendered diagram size in the modal", () => {
      const container = document.createElement("div");
      container.className = CSS_CLASSES.GRAPHVIZ_CONTAINER;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "800");
      svg.setAttribute("height", "600");
      container.appendChild(svg);
      document.body.appendChild(container);

      vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        width: 320,
        height: 180,
        top: 0,
        left: 0,
        right: 320,
        bottom: 180,
        toJSON: () => ({}),
      } as DOMRect);

      showDiagramModal(svg, container);

      const modalSvg = document.querySelector(`.${CSS_CLASSES.DIAGRAM_MODAL_CONTENT} svg`) as SVGSVGElement;
      expect(modalSvg.style.width).toBe("320px");
      expect(modalSvg.style.height).toBe("180px");
      expect(modalSvg.getAttribute("width")).toBeNull();
      expect(modalSvg.getAttribute("height")).toBeNull();
    });
  });
});
