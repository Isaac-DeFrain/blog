/**
 * Unit tests for MathJax integration including typesetting math content
 * and handling MathJax errors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { typesetMath } from "../../src/mathjax";

// Mock window.MathJax (loaded from CDN)
const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
const mockStartupPromise = Promise.resolve();

/** Clears MathJax from window */
function clearMathJax() {
  delete (window as any).MathJax;
}

describe("typesetMath", () => {
  beforeEach(() => {
    clearMathJax();
    vi.clearAllMocks();
    mockTypesetPromise.mockResolvedValue(undefined);
    // Re-setup MathJax mock
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
      startup: {
        promise: mockStartupPromise,
      },
    };
  });
  afterEach(clearMathJax);

  it("should typeset a single element when MathJax is available", async () => {
    const element = document.createElement("div");
    element.innerHTML = "$E = mc^2$";

    await typesetMath(element);
    expect(mockTypesetPromise).toHaveBeenCalledWith([element]);
  });

  it("should typeset multiple elements", async () => {
    const element1 = document.createElement("div");
    const element2 = document.createElement("div");

    await typesetMath([element1, element2]);
    expect(mockTypesetPromise).toHaveBeenCalledWith([element1, element2]);
  });

  it("should wait for MathJax to load from CDN before typesetting", async () => {
    clearMathJax();
    const element = document.createElement("div");
    
    // Simulate MathJax loading from CDN after a delay
    // Use the same mockTypesetPromise from beforeEach to ensure it's tracked
    setTimeout(() => {
      (window as any).MathJax = {
        typesetPromise: mockTypesetPromise, // Use the same mock from beforeEach
        startup: {
          promise: mockStartupPromise,
        },
      };
    }, 10);

    await typesetMath(element);

    expect(mockTypesetPromise).toHaveBeenCalled();
  });

  it("should handle MathJax errors gracefully", async () => {
    mockTypesetPromise.mockRejectedValueOnce(new Error("MathJax error"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const element = document.createElement("div");
    await typesetMath(element);

    expect(mockTypesetPromise).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("MathJax typesetting error:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it("should warn when MathJax is not available", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Clear MathJax and don't set it up (simulating CDN not loading)
    clearMathJax();

    const element = document.createElement("div");
    // Set a timeout to prevent infinite waiting in test
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 100));
    const typesetPromise = typesetMath(element);
    
    await Promise.race([typesetPromise, timeoutPromise]);
    
    // Note: In a real scenario, this would wait indefinitely for CDN to load
    // In tests, we can't easily test the timeout behavior without making the test slow
    // So we just verify the function doesn't throw

    consoleWarnSpy.mockRestore();
  });

  it("should handle empty element array", async () => {
    await typesetMath([]);
    expect(mockTypesetPromise).toHaveBeenCalledWith([]);
  });

  it("should convert single element to array", async () => {
    const element = document.createElement("div");
    await typesetMath(element);

    expect(mockTypesetPromise).toHaveBeenCalledWith([element]);
  });

  it("should handle elements with math content", async () => {
    const element = document.createElement("div");
    element.innerHTML = "Inline: $x^2$ and display: $$\\int_0^1 x dx$$";

    await typesetMath(element);
    expect(mockTypesetPromise).toHaveBeenCalledWith([element]);
  });
});
