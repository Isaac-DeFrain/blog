/**
 * Unit tests for DOM utility functions
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getElementByIdSafe,
  querySelectorSafe,
  querySelectorAllSafe,
  createElement,
  setClasses,
  addClasses,
  removeClasses,
  setAttributes,
  appendChildren,
  requireElement,
} from "../../src/utils/dom";

describe("getElementByIdSafe", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should return element when found", () => {
    const element = document.createElement("div");
    element.id = "test-id";
    document.body.appendChild(element);

    const result = getElementByIdSafe("test-id");
    expect(result).toBe(element);
  });

  it("should return null when element not found", () => {
    const result = getElementByIdSafe("non-existent");
    expect(result).toBeNull();
  });
});

describe("querySelectorSafe", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should return element when found", () => {
    const parent = document.createElement("div");
    const child = document.createElement("span");
    child.className = "test-class";
    parent.appendChild(child);
    document.body.appendChild(parent);

    const result = querySelectorSafe<HTMLSpanElement>(parent, ".test-class");
    expect(result).toBe(child);
  });

  it("should return null when element not found", () => {
    const parent = document.createElement("div");
    const result = querySelectorSafe(parent, ".non-existent");
    expect(result).toBeNull();
  });

  it("should work with document as parent", () => {
    const element = document.createElement("div");
    element.id = "doc-test";
    document.body.appendChild(element);

    const result = querySelectorSafe<HTMLDivElement>(document, "#doc-test");
    expect(result).toBe(element);
  });
});

describe("querySelectorAllSafe", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should return array of matching elements", () => {
    const parent = document.createElement("div");
    const child1 = document.createElement("span");
    child1.className = "test-class";
    const child2 = document.createElement("span");
    child2.className = "test-class";
    parent.appendChild(child1);
    parent.appendChild(child2);
    document.body.appendChild(parent);

    const result = querySelectorAllSafe<HTMLSpanElement>(parent, ".test-class");
    expect(result).toHaveLength(2);
    expect(result).toContain(child1);
    expect(result).toContain(child2);
  });

  it("should return empty array when no matches", () => {
    const parent = document.createElement("div");
    const result = querySelectorAllSafe(parent, ".non-existent");
    expect(result).toEqual([]);
  });
});

describe("createElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should create element with tag name only", () => {
    const element = createElement("div");
    expect(element.tagName).toBe("DIV");
  });

  it("should create element with className as string", () => {
    const element = createElement("div", { className: "test-class" });
    expect(element.className).toBe("test-class");
  });

  it("should create element with className as array", () => {
    const element = createElement("div", { className: ["class1", "class2"] });
    expect(element.className).toBe("class1 class2");
  });

  it("should create element with textContent", () => {
    const element = createElement("div", { textContent: "Hello World" });
    expect(element.textContent).toBe("Hello World");
  });

  it("should create element with innerHTML", () => {
    const element = createElement("div", { innerHTML: "<span>Test</span>" });
    expect(element.innerHTML).toBe("<span>Test</span>");
  });

  it("should create element with id", () => {
    const element = createElement("div", { id: "test-id" });
    expect(element.id).toBe("test-id");
  });

  it("should create element with attributes", () => {
    const element = createElement("a", {
      attributes: {
        href: "https://example.com",
        target: "_blank",
      },
    });
    expect(element.getAttribute("href")).toBe("https://example.com");
    expect(element.getAttribute("target")).toBe("_blank");
  });

  it("should create element with all options combined", () => {
    const element = createElement("div", {
      className: ["class1", "class2"],
      textContent: "Hello",
      id: "test-id",
      attributes: {
        "data-test": "value",
      },
    });
    expect(element.className).toBe("class1 class2");
    expect(element.textContent).toBe("Hello");
    expect(element.id).toBe("test-id");
    expect(element.getAttribute("data-test")).toBe("value");
  });

  it("should create different element types", () => {
    const div = createElement("div");
    const span = createElement("span");
    const button = createElement("button");
    const input = createElement("input");

    expect(div.tagName).toBe("DIV");
    expect(span.tagName).toBe("SPAN");
    expect(button.tagName).toBe("BUTTON");
    expect(input.tagName).toBe("INPUT");
  });
});

describe("setClasses", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should set classes from string", () => {
    const element = document.createElement("div");
    setClasses(element, "class1 class2 class3");
    expect(element.className).toBe("class1 class2 class3");
  });

  it("should set classes from array", () => {
    const element = document.createElement("div");
    setClasses(element, ["class1", "class2", "class3"]);
    expect(element.className).toBe("class1 class2 class3");
  });

  it("should replace existing classes", () => {
    const element = document.createElement("div");
    element.className = "old-class";
    setClasses(element, "new-class");
    expect(element.className).toBe("new-class");
  });

  it("should handle empty string", () => {
    const element = document.createElement("div");
    element.className = "old-class";
    setClasses(element, "");
    expect(element.className).toBe("");
  });

  it("should handle empty array", () => {
    const element = document.createElement("div");
    element.className = "old-class";
    setClasses(element, []);
    expect(element.className).toBe("");
  });

  it("should filter out empty strings from space-separated string", () => {
    const element = document.createElement("div");
    setClasses(element, "class1   class2  ");
    expect(element.className).toBe("class1 class2");
  });
});

describe("addClasses", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should add classes from string", () => {
    const element = document.createElement("div");
    element.className = "existing";
    addClasses(element, "new1 new2");
    expect(element.className).toBe("existing new1 new2");
  });

  it("should add classes from array", () => {
    const element = document.createElement("div");
    element.className = "existing";
    addClasses(element, ["new1", "new2"]);
    expect(element.className).toBe("existing new1 new2");
  });

  it("should not duplicate existing classes", () => {
    const element = document.createElement("div");
    element.className = "existing";
    addClasses(element, "existing new");
    expect(element.className).toBe("existing new");
  });

  it("should handle empty string", () => {
    const element = document.createElement("div");
    element.className = "existing";
    addClasses(element, "");
    expect(element.className).toBe("existing");
  });

  it("should handle empty array", () => {
    const element = document.createElement("div");
    element.className = "existing";
    addClasses(element, []);
    expect(element.className).toBe("existing");
  });
});

describe("removeClasses", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should remove classes from string", () => {
    const element = document.createElement("div");
    element.className = "class1 class2 class3";
    removeClasses(element, "class2");
    expect(element.className).toBe("class1 class3");
  });

  it("should remove classes from array", () => {
    const element = document.createElement("div");
    element.className = "class1 class2 class3";
    removeClasses(element, ["class1", "class3"]);
    expect(element.className).toBe("class2");
  });

  it("should handle non-existent classes", () => {
    const element = document.createElement("div");
    element.className = "class1";
    removeClasses(element, "non-existent");
    expect(element.className).toBe("class1");
  });

  it("should handle empty string", () => {
    const element = document.createElement("div");
    element.className = "class1";
    removeClasses(element, "");
    expect(element.className).toBe("class1");
  });

  it("should handle empty array", () => {
    const element = document.createElement("div");
    element.className = "class1";
    removeClasses(element, []);
    expect(element.className).toBe("class1");
  });

  it("should remove all classes", () => {
    const element = document.createElement("div");
    element.className = "class1 class2 class3";
    removeClasses(element, ["class1", "class2", "class3"]);
    expect(element.className).toBe("");
  });
});

describe("setAttributes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should set multiple attributes", () => {
    const element = document.createElement("a");
    setAttributes(element, {
      href: "https://example.com",
      target: "_blank",
      "data-test": "value",
    });
    expect(element.getAttribute("href")).toBe("https://example.com");
    expect(element.getAttribute("target")).toBe("_blank");
    expect(element.getAttribute("data-test")).toBe("value");
  });

  it("should replace existing attributes", () => {
    const element = document.createElement("a");
    element.setAttribute("href", "old-url");
    setAttributes(element, {
      href: "new-url",
    });
    expect(element.getAttribute("href")).toBe("new-url");
  });

  it("should handle empty attributes object", () => {
    const element = document.createElement("div");
    element.setAttribute("data-test", "value");
    setAttributes(element, {});
    expect(element.getAttribute("data-test")).toBe("value");
  });
});

describe("appendChildren", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should append multiple children", () => {
    const parent = document.createElement("div");
    const child1 = document.createElement("span");
    const child2 = document.createElement("span");
    appendChildren(parent, [child1, child2]);
    expect(parent.children).toHaveLength(2);
    expect(parent.children[0]).toBe(child1);
    expect(parent.children[1]).toBe(child2);
  });

  it("should skip null children", () => {
    const parent = document.createElement("div");
    const child1 = document.createElement("span");
    const child2 = document.createElement("span");
    appendChildren(parent, [child1, null, child2, null]);
    expect(parent.children).toHaveLength(2);
    expect(parent.children[0]).toBe(child1);
    expect(parent.children[1]).toBe(child2);
  });

  it("should handle empty array", () => {
    const parent = document.createElement("div");
    appendChildren(parent, []);
    expect(parent.children).toHaveLength(0);
  });

  it("should handle array with only nulls", () => {
    const parent = document.createElement("div");
    appendChildren(parent, [null, null]);
    expect(parent.children).toHaveLength(0);
  });
});

describe("requireElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should return element when not null", () => {
    const element = document.createElement("div");
    const result = requireElement(element, "Element not found");
    expect(result).toBe(element);
  });

  it("should throw error when element is null", () => {
    const element = null;
    expect(() => {
      requireElement(element, "Element not found");
    }).toThrow("Element not found");
  });

  it("should throw error with custom message", () => {
    const element = null;
    expect(() => {
      requireElement(element, "Custom error message");
    }).toThrow("Custom error message");
  });

  it("should work with typed elements", () => {
    const element = document.createElement("button") as HTMLButtonElement;
    const result = requireElement<HTMLButtonElement>(element, "Button not found");
    expect(result).toBe(element);
    expect(result.tagName).toBe("BUTTON");
  });
});
