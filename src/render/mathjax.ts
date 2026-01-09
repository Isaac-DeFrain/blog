/**
 * MathJax utilities for rendering mathematical expressions.
 *
 * Provides helper functions to wait for MathJax to be ready and
 * to typeset mathematical expressions in dynamically loaded content.
 */

// Extend Window interface for MathJax
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      startup?: {
        ready?: () => Promise<void>;
        promise?: Promise<void>;
      };
      tex?: {
        inlineMath?: string[][];
        displayMath?: string[][];
        processEscapes?: boolean;
        processEnvironments?: boolean;
      };
      options?: {
        skipHtmlTags?: string[];
      };
    };
  }
}

// Cache MathJax initialization
let mathJaxInitialized = false;

/**
 * Initializes MathJax by waiting for it to load from CDN.
 */
async function initializeMathJax(): Promise<void> {
  // If we think MathJax is initialized but it's not actually available, reset the cache
  if (mathJaxInitialized && typeof window !== "undefined" && !window.MathJax) {
    mathJaxInitialized = false;
  }

  if (mathJaxInitialized) {
    return;
  }

  // Wait for MathJax to be available from CDN
  if (typeof window !== "undefined" && !window.MathJax) {
    // Wait for MathJax to load from CDN script
    await new Promise<void>((resolve) => {
      const checkMathJax = () => {
        if (window.MathJax) {
          resolve();
        } else {
          setTimeout(checkMathJax, 50);
        }
      };

      checkMathJax();
    });
  }

  // Wait for MathJax to be ready
  if (window.MathJax?.startup?.promise) {
    await window.MathJax.startup.promise;
  }

  mathJaxInitialized = true;
}

/**
 * Typesets mathematical expressions in the given element(s).
 *
 * @param elements - The HTML element(s) containing math expressions to typeset
 * @returns Promise that resolves when typesetting is complete
 */
export async function typesetMath(elements: HTMLElement | HTMLElement[]): Promise<void> {
  try {
    await initializeMathJax();

    if (!window.MathJax?.typesetPromise) {
      console.warn("MathJax is not available");
      return;
    }

    const elementsArray = Array.isArray(elements) ? elements : [elements];
    await window.MathJax.typesetPromise(elementsArray);
  } catch (error) {
    console.error("MathJax typesetting error:", error);
  }
}
