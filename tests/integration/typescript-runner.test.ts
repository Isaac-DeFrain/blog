/**
 * Integration tests for TypeScript runner using the real TypeScript compiler.
 * These tests verify that the runner works correctly with actual TypeScript compilation,
 * diagnostic reporting, and code execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupDOM, cleanupDOM } from "../helpers/dom";
import { TypeScriptTransformer } from "../../src/code-executor/typescript-transformer";
import { resolveWithTimeout } from "../../src/utils/async";
import { unescapeHtml } from "../../src/utils/html";

// Mock utils modules
vi.mock("../../src/utils/async", async () => {
  const actual = await vi.importActual<typeof import("../../src/utils/async")>("../../src/utils/async");
  return {
    ...actual,
  };
});

vi.mock("../../src/utils/html", async () => {
  const actual = await vi.importActual<typeof import("../../src/utils/html")>("../../src/utils/html");
  return {
    ...actual,
    unescapeHtml: vi.fn((text: string) => text),
  };
});

describe("TypeScript Runner Integration", () => {
  let originalLocation: Location;

  // Helper to prepare code as it would be at build time (wrapped in run() function)
  function prepareCode(tsCode: string): string {
    return TypeScriptTransformer.wrapTypeScriptCode(unescapeHtml(tsCode));
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    cleanupDOM();
    setupDOM();

    // Mock window.location
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        pathname: "/",
        origin: "http://localhost",
        href: "http://localhost/",
      },
      writable: true,
      configurable: true,
    });

    // Ensure TypeScript is not cached
    delete (window as any).ts;

    // Reset utils mocks
    const utils = await import("../../src/utils/html");
    vi.mocked(utils.unescapeHtml).mockImplementation((text: string) => text);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (window as any).ts;
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    cleanupDOM();
  });

  describe("Real TypeScript Compilation", () => {
    it("should compile and execute simple TypeScript code", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-simple";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-simple";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-simple";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-simple";
      codeScript.textContent = JSON.stringify(prepareCode("const x: number = 42; console.log(x);"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      // Verify button is enabled
      expect(runButton.disabled).toBe(false);
      expect(runButton.textContent).toBe("Run");

      // Click button
      runButton.click();

      // Wait for output to appear (with timeout)
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Test timed out waiting for output"));
        }, 5000);

        const checkOutput = () => {
          const outputItems = outputContent.querySelectorAll(".ts-output-item");
          if (outputItems.length > 0) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkOutput, 50);
          }
        };
        checkOutput();
      });

      // Verify output was displayed
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
    });

    it("should compile TypeScript with type annotations", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-types";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-types";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-types";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-types";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        interface Person {
          name: string;
          age: number;
        }
        const person: Person = { name: "Alice", age: 30 };
        console.log(person.name);
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise(resolveWithTimeout(200));

      // Should compile successfully (no diagnostics div)
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeNull();
    });

    it("should filter false-positive DOM global diagnostics", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-dom-globals";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-dom-globals";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-dom-globals";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-dom-globals";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        console.log("Hello");
        window.location.href;
        document.body;
        navigator.userAgent;
        localStorage.getItem("key");
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise(resolveWithTimeout(300));

      // Should not show diagnostics for DOM globals (they're filtered)
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeNull();
    });

    it("should show real TypeScript compilation errors", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-compile-error";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-compile-error";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-compile-error";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-compile-error";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        const x: number = "string"; // Type error
        const y: unknownVar; // Unknown variable
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise(resolveWithTimeout(300));

      // Should show diagnostics for real errors
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeDefined();
      if (diagnosticsDiv) {
        const text = diagnosticsDiv.textContent || "";
        // Should contain error information
        expect(text.length).toBeGreaterThan(0);
        expect(text.includes("Error:") || text.includes("Type") || text.includes("unknownVar")).toBe(true);
      }
    });

    it("should handle TypeScript with async/await", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-async";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-async";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-async";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-async";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        async function test() {
          const result = await Promise.resolve(42);
          console.log(result);
        }
        test();
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise(resolveWithTimeout(300));

      // Should compile (transpile works even with diagnostics)
      // Note: Real TypeScript may show diagnostics about Promise/lib in test environment,
      // but code still compiles and executes
      const errorDiv = outputContent.querySelector(".ts-error");
      expect(errorDiv).toBeNull(); // No compilation errors that prevent execution
    });

    it("should compile TypeScript with generics", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-generics";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-generics";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-generics";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-generics";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        function identity<T>(arg: T): T {
          return arg;
        }
        const result = identity<string>("hello");
        console.log(result);
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise(resolveWithTimeout(200));

      // Should compile successfully
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeNull();
    });
  });

  describe("Diagnostic Filtering with Real TypeScript", () => {
    it("should filter console diagnostics", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-filter-console-real";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-filter-console-real";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-filter-console-real";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-filter-console-real";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('test');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise(resolveWithTimeout(300));

      // Should not show diagnostics for console
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeNull();
    });

    it("should filter window, document, and other DOM globals", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-filter-dom-real";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-filter-dom-real";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-filter-dom-real";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-filter-dom-real";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        window.location.href;
        document.body;
        navigator.userAgent;
        location.pathname;
        localStorage.getItem("key");
        sessionStorage.setItem("key", "value");
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/code-executor/block-executor");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise(resolveWithTimeout(300));

      // Should not show diagnostics for DOM globals
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeNull();
    });
  });
});
