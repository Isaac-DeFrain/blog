/**
 * @module utils/dom
 *
 * Safe DOM manipulation utilities with proper error handling.
 */

import type { MaybeElement } from "../blog/types";

/**
 * Safely gets an element by ID, returning null if not found.
 *
 * @param id - The element ID to search for
 * @returns The element if found, null otherwise
 */
export function getElementByIdSafe(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * Safely queries a selector within a parent element.
 *
 * @param parent - The parent element to search within
 * @param selector - The CSS selector to match
 * @returns The first matching element if found, null otherwise
 */
export function querySelectorSafe<T extends HTMLElement = HTMLElement>(parent: ParentNode, selector: string): T | null {
  return parent.querySelector<T>(selector);
}

/**
 * Safely queries all matching elements within a parent element.
 *
 * @param parent - The parent element to search within
 * @param selector - The CSS selector to match
 * @returns Array of matching elements
 */
export function querySelectorAllSafe<T extends HTMLElement = HTMLElement>(parent: ParentNode, selector: string): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

/**
 * Creates a DOM element with optional class names and content.
 *
 * @param tagName - The HTML tag name
 * @param options - Options for element creation
 * @returns The created element
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    className?: string | string[];
    textContent?: string;
    innerHTML?: string;
    id?: string;
    attributes?: Record<string, string>;
  },
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (options) {
    if (options.className) {
      setClasses(element, options.className);
    }
    if (options.textContent !== undefined) {
      element.textContent = options.textContent;
    }
    if (options.innerHTML !== undefined) {
      element.innerHTML = options.innerHTML;
    }
    if (options.id) {
      element.id = options.id;
    }
    if (options.attributes) {
      setAttributes(element, options.attributes);
    }
  }

  return element;
}

/**
 * Sets CSS classes on an element.
 * Can accept a single class string, array of classes, or space-separated string.
 *
 * @param element - The element to set classes on
 * @param classes - Class name(s) to set
 */
export function setClasses(element: HTMLElement, classes: string | string[]): void {
  const classList = Array.isArray(classes) ? classes : classes.split(/\s+/).filter(Boolean);
  element.className = classList.join(" ");
}

/**
 * Adds CSS classes to an element without removing existing ones.
 *
 * @param element - The element to add classes to
 * @param classes - Class name(s) to add
 */
export function addClasses(element: HTMLElement, classes: string | string[]): void {
  const classList = Array.isArray(classes) ? classes : classes.split(/\s+/).filter(Boolean);
  classList.forEach((cls) => element.classList.add(cls));
}

/**
 * Removes CSS classes from an element.
 *
 * @param element - The element to remove classes from
 * @param classes - Class name(s) to remove
 */
export function removeClasses(element: HTMLElement, classes: string | string[]): void {
  const classList = Array.isArray(classes) ? classes : classes.split(/\s+/).filter(Boolean);
  classList.forEach((cls) => element.classList.remove(cls));
}

/**
 * Sets multiple attributes on an element.
 *
 * @param element - The element to set attributes on
 * @param attributes - Object mapping attribute names to values
 */
export function setAttributes(element: HTMLElement, attributes: Record<string, string>): void {
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
}

/**
 * Appends multiple children to a parent element.
 *
 * @param parent - The parent element
 * @param children - Array of child elements to append
 */
export function appendChildren(parent: HTMLElement, children: (Node | null)[]): void {
  children.forEach((child) => {
    if (child !== null) {
      parent.appendChild(child);
    }
  });
}

/**
 * Safely checks if an element exists and throws an error if not.
 *
 * @param element - The element to check
 * @param errorMessage - Error message to throw if element is null
 * @returns The element (guaranteed to be non-null)
 * @throws Error if element is null
 */
export function requireElement<T extends HTMLElement>(element: MaybeElement<T>, errorMessage: string): T {
  if (element === null) {
    throw new Error(errorMessage);
  }
  return element;
}
