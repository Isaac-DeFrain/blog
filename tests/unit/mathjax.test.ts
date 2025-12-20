import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitForMathJax, typesetMath } from "../../src/mathjax";

describe("waitForMathJax", () => {
  beforeEach(() => {
    // Clear MathJax from window
    delete (window as any).MathJax;
  });

  afterEach(() => {
    // Clean up
    delete (window as any).MathJax;
  });

  it("should resolve immediately if MathJax is already ready", async () => {
    const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = {
      typesetPromise: mockTypesetPromise,
    };

    await waitForMathJax();
    // Should resolve immediately without waiting
    expect(mockTypesetPromise).not.toHaveBeenCalled();
  });

  it("should wait for MathJax startup promise if typesetPromise is not available", async () => {
    const mockStartupPromise = Promise.resolve();
    (window as any).MathJax = {
      startup: {
        promise: mockStartupPromise,
      },
    };

    const waitPromise = waitForMathJax();
    // Should wait for startup promise
    await waitPromise;
    expect((window as any).MathJax).toBeDefined();
  });

  it("should poll until MathJax is available", async () => {
    // Use a timer to simulate MathJax loading
    setTimeout(() => {
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };
    }, 50);

    const waitPromise = waitForMathJax();
    await waitPromise;
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
    // Should use typesetPromise (preferred)
    expect((window as any).MathJax.typesetPromise).toBeDefined();
  });
});

describe("typesetMath", () => {
  beforeEach(() => {
    delete (window as any).MathJax;
  });

  afterEach(() => {
    delete (window as any).MathJax;
  });

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
    delete (window as any).MathJax;

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
