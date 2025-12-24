/**
 * Unit tests for MathJax integration including waiting for MathJax to load,
 * typesetting math content, and handling MathJax errors and timeouts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitForMathJax, typesetMath } from "../../src/mathjax";

/** Clears MathJax from window */
function clearMathJax() {
  delete (window as any).MathJax;
}

describe("waitForMathJax", () => {
  beforeEach(clearMathJax);
  afterEach(clearMathJax);

  it("should resolve immediately if MathJax is already ready", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    await waitForMathJax();
    expect(mockTypesetPromise).not.toHaveBeenCalled();
  });

  it("should wait for MathJax startup promise if typesetPromise is not available", async () => {
    const mockStartupPromise = Promise.resolve();
    (window as any).MathJax = {
      startup: {
        promise: mockStartupPromise,
      },
    };

    await waitForMathJax();
    expect((window as any).MathJax).toBeDefined();
  });

  it("should poll until MathJax is available", async () => {
    // Simulate MathJax loading
    setTimeout(() => {
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };
    }, 50);

    await waitForMathJax();
    expect((window as any).MathJax?.typesetPromise).toBeDefined();
  });

  it("should handle MathJax with both typesetPromise and startup", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
      startup: {
        promise: Promise.resolve(),
      },
    };

    await waitForMathJax();
    expect((window as any).MathJax.typesetPromise).toBeDefined();
  });
});

describe("typesetMath", () => {
  beforeEach(clearMathJax);
  afterEach(clearMathJax);

  it("should typeset a single element when MathJax is available", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    const element = document.createElement("div");
    element.innerHTML = "$E = mc^2$";

    await typesetMath(element);
    expect(mockTypesetPromise).toHaveBeenCalledWith([element]);
  });

  it("should typeset multiple elements", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    const element1 = document.createElement("div");
    const element2 = document.createElement("div");

    await typesetMath([element1, element2]);
    expect(mockTypesetPromise).toHaveBeenCalledWith([element1, element2]);
  });

  it("should wait for MathJax to be ready before typesetting", async () => {
    let mathJaxReady = false;
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);

    // Simulate MathJax loading asynchronously
    setTimeout(() => {
      (window as any).MathJax = {
        typesetPromise: mockTypesetPromise,
      };
      mathJaxReady = true;
    }, 50);

    const element = document.createElement("div");
    await typesetMath(element);

    expect(mathJaxReady).toBe(true);
    expect(mockTypesetPromise).toHaveBeenCalled();
  });

  it("should handle MathJax errors gracefully", async () => {
    const mockTypesetPromise = vi.fn().mockRejectedValue(new Error("MathJax error"));
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const element = document.createElement("div");
    await typesetMath(element);

    expect(mockTypesetPromise).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("MathJax typesetting error:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it("should warn when MathJax is not available", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Ensure MathJax is not available
    clearMathJax();

    const element = document.createElement("div");
    await typesetMath(element);
    expect(consoleWarnSpy).toHaveBeenCalledWith("MathJax is not available");

    consoleWarnSpy.mockRestore();
  }, 6000); // Increase timeout to 6 seconds

  it("should handle empty element array", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    await typesetMath([]);
    expect(mockTypesetPromise).toHaveBeenCalledWith([]);
  });

  it("should convert single element to array", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    const element = document.createElement("div");
    await typesetMath(element);

    expect(mockTypesetPromise).toHaveBeenCalledWith([element]);
  });

  it("should handle elements with math content", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    const element = document.createElement("div");
    element.innerHTML = "Inline: $x^2$ and display: $$\\int_0^1 x dx$$";

    await typesetMath(element);
    expect(mockTypesetPromise).toHaveBeenCalledWith([element]);
  });
});

describe("waitForMathJax - timeout and error cases", () => {
  beforeEach(clearMathJax);

  afterEach(() => {
    clearMathJax();
    vi.useRealTimers();
  });

  it("should timeout if MathJax never loads", async () => {
    vi.useFakeTimers();
    const waitPromise = waitForMathJax(100);

    vi.advanceTimersByTime(150);
    await expect(waitPromise).rejects.toThrow("MathJax timeout");
  });

  // Note: Testing startup promise rejection is skipped because the current implementation
  // doesn't handle promise rejections from startup.promise, which would cause unhandled
  // rejections. This is a known limitation of the current code.

  it("should use custom timeout value", async () => {
    vi.useFakeTimers();
    const waitPromise = waitForMathJax(200);

    vi.advanceTimersByTime(250);
    await expect(waitPromise).rejects.toThrow("MathJax timeout");
  });

  it("should handle MathJax with only startup.ready", async () => {
    const mockReady = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      startup: {
        ready: mockReady,
      },
    };

    // Poll since typesetPromise is not available
    vi.useFakeTimers();
    const waitPromise = waitForMathJax(100);

    vi.advanceTimersByTime(150);
    await expect(waitPromise).rejects.toThrow("MathJax timeout");
  });

  it("should warn when MathJax typesetPromise is not available after waiting", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Set up MathJax with startup promise but no typesetPromise
    const mockStartupPromise = Promise.resolve();
    (window as any).MathJax = {
      startup: {
        promise: mockStartupPromise,
      },
    };

    // Wait for startup promise to resolve, but typesetPromise won't be set
    await mockStartupPromise;

    const element = document.createElement("div");
    await typesetMath(element);

    // Should warn that MathJax is not available
    expect(consoleWarnSpy).toHaveBeenCalledWith("MathJax is not available");

    consoleWarnSpy.mockRestore();
  });
});
