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
    };
  }
}

/**
 * Waits for MathJax to be fully loaded and ready.
 *
 * @returns Promise that resolves when MathJax is ready to use
 */
export async function waitForMathJax(): Promise<void> {
  // If MathJax is already loaded and has typesetPromise, it's ready
  if (window.MathJax?.typesetPromise) {
    return Promise.resolve();
  }

  // Wait for MathJax to load
  return new Promise<void>((resolve) => {
    const checkMathJax = () => {
      if (window.MathJax?.typesetPromise) {
        resolve();
      } else if (window.MathJax?.startup?.promise) {
        window.MathJax.startup.promise.then(() => resolve());
      } else {
        setTimeout(checkMathJax, 50);
      }
    };
    checkMathJax();
  });
}

/**
 * Typesets mathematical expressions in the given element(s).
 *
 * Waits for MathJax to be ready before attempting to typeset.
 *
 * @param elements - The HTML element(s) containing math expressions to typeset
 * @returns Promise that resolves when typesetting is complete
 */
export async function typesetMath(elements: HTMLElement | HTMLElement[]): Promise<void> {
  await waitForMathJax();

  if (!window.MathJax?.typesetPromise) {
    console.warn("MathJax is not available");
    return;
  }

  const elementsArray = Array.isArray(elements) ? elements : [elements];
  try {
    await window.MathJax.typesetPromise(elementsArray);
  } catch (error) {
    console.error("MathJax typesetting error:", error);
  }
}
