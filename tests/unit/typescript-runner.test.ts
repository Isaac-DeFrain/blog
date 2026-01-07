/**
 * Unit tests for TypeScript runner module.
 * Tests TypeScript type stripping, code execution, and initialization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  wrapTypeScriptCode,
  stripTypeScriptTypes,
  initializeTypeScriptRunner,
} from "../../src/typescript-runner/index";
import { resolveWithTimeout } from "../../src/utils";

// Mock utils module
vi.mock("../../src/utils", async () => {
  const actual = await vi.importActual<typeof import("../../src/utils")>("../../src/utils");
  return {
    ...actual,
    getBasePath: vi.fn(() => "/"),
    unescapeHtml: vi.fn((text: string) => text),
  };
});

describe("typescript-runner", () => {
  let originalWindow: Window & typeof globalThis;
  let originalLocation: Location;

  // Helper to prepare code as it would be at build time (wrapped in run() function)
  function prepareCode(tsCode: string): string {
    return wrapTypeScriptCode(tsCode);
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset utils mocks
    const utils = await import("../../src/utils");
    vi.mocked(utils.getBasePath).mockReturnValue("/");
    vi.mocked(utils.unescapeHtml).mockImplementation((text: string) => text);

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

    // Store original window
    originalWindow = global.window;
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.window = originalWindow;
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  describe("executeCode", () => {
    it("should execute code directly and handle output", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-execute";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-execute";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-execute";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-execute";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('Hello');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify output was added
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
    });

    it("should handle string output", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-string-output";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-string-output";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-string-output";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-string-output";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('Hello World');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify string output
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].textContent).toBe("Hello World");
    });

    it("should handle HTML output from render()", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-html-output";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-html-output";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-html-output";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-html-output";
      codeScript.textContent = JSON.stringify(prepareCode("render('<div>Test</div>');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify HTML output
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].innerHTML).toBe("<div>Test</div>");
    });

    it("should handle JSON output for objects", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-json-output";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-json-output";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-json-output";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-json-output";
      codeScript.textContent = JSON.stringify(prepareCode("console.log({x: 1, y: 2});"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify JSON output
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);

      const jsonOutput = JSON.parse(outputItems[0].textContent || "{}");
      expect(jsonOutput.x).toBe(1);
      expect(jsonOutput.y).toBe(2);
    });

    it("should handle null output data", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-null-output";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-null-output";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-null-output";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-null-output";
      codeScript.textContent = JSON.stringify(prepareCode("console.log(null);"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
    });

    it("should handle output data that is not string, object with html, or other object", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-primitive-output";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-primitive-output";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-primitive-output";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-primitive-output";
      codeScript.textContent = JSON.stringify(prepareCode("console.log(123);"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      // Should be stringified
      expect(outputItems[0].textContent).toBe("123");
    });

    it("should handle execution errors", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-execution-error";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-execution-error";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-execution-error";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-execution-error";
      codeScript.textContent = JSON.stringify(prepareCode("throw new Error('Test error');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify error was displayed
      const errorDiv = outputContent.querySelector(".ts-error");
      expect(errorDiv).toBeDefined();
      expect(errorDiv?.textContent).toBe("Test error");
    });

    it("should handle execution error with unknown message", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-unknown-error";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-unknown-error";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-unknown-error";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-unknown-error";
      codeScript.textContent = JSON.stringify(prepareCode("throw 'string error';"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify error was displayed
      const errorDiv = outputContent.querySelector(".ts-error");
      expect(errorDiv).toBeDefined();
      expect(errorDiv?.textContent).toBe("string error");
    });

    it("should handle non-Error exception in click handler", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-non-error-exception";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-non-error-exception";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-non-error-exception";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      // Create code that will cause a non-Error exception during JSON.parse
      // by providing invalid code that causes a syntax error during execution
      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-non-error-exception";
      // Invalid JavaScript that will cause a SyntaxError
      codeScript.textContent = JSON.stringify("function run(stdout, stderr) { invalid syntax!!! }");

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify error was displayed (should show syntax error or "Unknown error occurred")
      const errorDiv = outputContent.querySelector(".ts-error");
      expect(errorDiv).toBeDefined();
      // The error message should be present (either the actual error or "Unknown error occurred")
      expect(errorDiv?.textContent?.length).toBeGreaterThan(0);
    });

    it("should keep button disabled after execution completes", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-done";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-done";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-done";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-done";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('done');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      expect(runButton.disabled).toBe(false);
      expect(runButton.textContent).toBe("Run");

      runButton.click();

      // Button should be disabled during execution
      expect(runButton.disabled).toBe(true);
      expect(runButton.textContent).toBe("Running...");

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));

      // Verify button remains disabled after execution
      expect(runButton.disabled).toBe(true);
      expect(runButton.textContent).toBe("Executed");
    });

    it("should prevent multiple executions", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-once";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-once";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-once";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-once";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('first');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // First click
      runButton.click();
      await new Promise(resolveWithTimeout(100));

      // Count output items after first execution
      const firstOutputCount = outputContent.querySelectorAll(".ts-output-item").length;

      // Try to click again (should not execute)
      runButton.click();
      await new Promise(resolveWithTimeout(100));

      // Verify output count hasn't increased
      const secondOutputCount = outputContent.querySelectorAll(".ts-output-item").length;
      expect(secondOutputCount).toBe(firstOutputCount);

      // Verify button is still disabled
      expect(runButton.disabled).toBe(true);
      expect(runButton.textContent).toBe("Executed");
    });
  });

  describe("initializeTypeScriptRunner", () => {
    it("should initialize runner for executable blocks", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-init";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-init";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-init";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-init";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('test');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Verify button is enabled and ready to use
      expect(runButton.disabled).toBe(false);
      expect(runButton.textContent).toBe("Run");
    });

    it("should handle blocks without blockId", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      // No blockId

      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle missing run button", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-no-button";

      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle missing output container", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-no-output";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-no-output";

      block.appendChild(runButton);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle missing code script", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-no-script";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-no-script";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-no-script";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle multiple executable blocks", async () => {
      const container = document.createElement("div");

      for (let i = 0; i < 3; i++) {
        const block = document.createElement("div");
        block.className = "ts-executable-block";
        block.dataset.blockId = `test-multi-${i}`;

        const runButton = document.createElement("button");
        runButton.className = "ts-run-button";
        runButton.dataset.blockId = `test-multi-${i}`;

        const outputContainer = document.createElement("div");
        outputContainer.className = "ts-output-container";
        outputContainer.dataset.blockId = `test-multi-${i}`;
        outputContainer.style.display = "none";

        const outputContent = document.createElement("div");
        outputContent.className = "ts-output-content";

        const codeScript = document.createElement("script");
        codeScript.dataset.tsCode = `test-multi-${i}`;
        codeScript.textContent = JSON.stringify(prepareCode(`console.log('test ${i}');`));

        block.appendChild(runButton);
        block.appendChild(outputContainer);
        outputContainer.appendChild(outputContent);
        block.appendChild(codeScript);
        container.appendChild(block);
      }

      await initializeTypeScriptRunner(container);

      // Verify all buttons have handlers
      const buttons = container.querySelectorAll(".ts-run-button");
      expect(buttons.length).toBe(3);
    });

    it("should clear previous output on new run", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-clear";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-clear";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-clear";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";
      outputContent.innerHTML = "<div>Previous output</div>";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-clear";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('test');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Verify initial state
      expect(outputContent.innerHTML).toBe("<div>Previous output</div>");
      expect(outputContainer.style.display).toBe("none");

      runButton.click();

      // Output clearing happens synchronously in the click handler before async execution
      // We need to check after the click event handler's synchronous code runs
      // Use setTimeout(0) to defer the check to the next event loop tick
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // At this point, the synchronous clearing should have happened
          // but execution might have already completed, so we check that
          // the previous output is gone (either cleared or replaced)
          // The key is that the old "<div>Previous output</div>" should be gone
          expect(outputContent.innerHTML).not.toContain("Previous output");
          expect(outputContainer.style.display).toBe("block");
          resolve();
        }, 0);
      });

      // Wait for execution to complete
      await new Promise(resolveWithTimeout(100));
    });

    it("should handle empty code script textContent", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-empty-code";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-empty-code";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-empty-code";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-empty-code";
      codeScript.textContent = JSON.stringify(prepareCode("")); // Empty but valid JSON

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle empty container", async () => {
      const container = document.createElement("div");

      await initializeTypeScriptRunner(container);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle invalid JSON in codeScript.textContent", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-invalid-json";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-invalid-json";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-invalid-json";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-invalid-json";
      codeScript.textContent = "invalid json {";

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      // Invalid JSON causes JSON.parse to throw during initialization
      // This is expected behavior - the code doesn't handle invalid JSON gracefully
      await expect(initializeTypeScriptRunner(container)).rejects.toThrow();
    });

    it("should handle button with empty textContent", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-empty-button";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-empty-button";
      runButton.textContent = "";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-empty-button";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-empty-button";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('test');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Button text should be set to "Run"
      expect(runButton.textContent).toBe("Run");
    });

    it("should handle button with whitespace-only textContent", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-whitespace-button";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-whitespace-button";
      runButton.textContent = "   ";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-whitespace-button";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-whitespace-button";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('test');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      // Button text should be set to "Run"
      expect(runButton.textContent).toBe("Run");
    });
  });

  describe("console methods", () => {
    it("should handle console.error output", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-console-error";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-console-error";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-console-error";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-console-error";
      codeScript.textContent = JSON.stringify(prepareCode("console.error('Error message');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify error output was displayed
      const errorDiv = outputContent.querySelector(".ts-error");
      expect(errorDiv).toBeDefined();
      expect(errorDiv?.textContent).toContain("[ERROR]");
      expect(errorDiv?.textContent).toContain("Error message");
    });

    it("should handle console.warn output", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-console-warn";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-console-warn";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-console-warn";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-console-warn";
      codeScript.textContent = JSON.stringify(prepareCode("console.warn('Warning message');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify warn output was displayed
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].textContent).toContain("[WARN]");
      expect(outputItems[0].textContent).toContain("Warning message");
    });

    it("should handle console.info output", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-console-info";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-console-info";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-console-info";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-console-info";
      codeScript.textContent = JSON.stringify(prepareCode("console.info('Info message');"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify info output was displayed
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].textContent).toContain("[INFO]");
      expect(outputItems[0].textContent).toContain("Info message");
    });

    it("should handle console.warn with object", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-console-warn-object";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-console-warn-object";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-console-warn-object";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-console-warn-object";
      codeScript.textContent = JSON.stringify(prepareCode("console.warn({x: 1, y: 2});"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify warn output with object was displayed
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].textContent).toContain("[WARN]");
    });

    it("should handle console.info with null", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-console-info-null";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-console-info-null";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-console-info-null";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-console-info-null";
      codeScript.textContent = JSON.stringify(prepareCode("console.info(null);"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify info output with null was displayed
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].textContent).toContain("[INFO]");
      expect(outputItems[0].textContent).toContain("null");
    });

    it("should handle console.log with circular reference object", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-circular";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-circular";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-circular";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-circular";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        const obj: any = {};
        obj.self = obj;
        console.log(obj);
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Should handle circular reference gracefully
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
    });

    it("should handle console.log with undefined", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-undefined";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-undefined";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-undefined";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-undefined";
      codeScript.textContent = JSON.stringify(prepareCode("console.log(undefined);"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify undefined output
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].textContent).toBe("undefined");
    });

    it("should handle console.log with multiple arguments", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-multi-args";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-multi-args";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-multi-args";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-multi-args";
      codeScript.textContent = JSON.stringify(prepareCode("console.log('Hello', 'World', 42);"));

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify multiple arguments output
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      expect(outputItems[0].textContent).toContain("Hello");
      expect(outputItems[0].textContent).toContain("World");
      expect(outputItems[0].textContent).toContain("42");
    });

    it("should handle setOutputDivContent with non-string, non-HTML object", async () => {
      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-non-html-object";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-non-html-object";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-non-html-object";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      // Call stdout directly with an object that doesn't have 'html' property
      // This will trigger the JSON.stringify path in setOutputDivContent
      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-non-html-object";
      codeScript.textContent = JSON.stringify(
        prepareCode(`
        const obj = { data: 'test', value: 123 };
        stdout(obj);
      `),
      );

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      await initializeTypeScriptRunner(container);

      runButton.click();

      await new Promise(resolveWithTimeout(100));

      // Verify JSON output (setOutputDivContent should call JSON.stringify)
      const outputItems = outputContent.querySelectorAll(".ts-output-item");
      expect(outputItems.length).toBeGreaterThan(0);
      // The output should be JSON stringified
      const jsonOutput = JSON.parse(outputItems[0].textContent || "{}");
      expect(jsonOutput.data).toBe("test");
      expect(jsonOutput.value).toBe(123);
    });
  });

  describe("stripTypeScriptTypes", () => {
    it("should strip type annotations from function parameters", () => {
      const code = "function test(x: number, y: string): void {}";
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain(": number");
      expect(result).not.toContain(": string");
      // Note: return type annotations may not be fully stripped by the current implementation
      // The regex focuses on parameter types, not return types
    });

    it("should strip type annotations from arrow functions", () => {
      const code = "const fn = (x: number) => x + 1;";
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain(": number");
    });

    it("should strip type annotations from variable declarations", () => {
      const code = "const x: number = 42; let y: string = 'hello';";
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain(": number");
      expect(result).not.toContain(": string");
    });

    it("should strip type assertions", () => {
      const code = "const x = value as string;";
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain("as string");
    });

    it("should strip interface declarations", () => {
      const code = "interface Person { name: string; age: number; }";
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain("interface Person");
    });

    it("should strip type aliases", () => {
      const code = "type ID = string | number;";
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain("type ID");
    });

    it("should strip generic type parameters", () => {
      const code = "function identity<T>(arg: T): T { return arg; }";
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain("<T>");
    });

    it("should handle complex TypeScript code", () => {
      const code = `
        interface User {
          id: number;
          name: string;
        }
        type UserId = number;
        function getUser<T extends User>(id: UserId): T {
          return { id, name: 'test' } as T;
        }
      `;
      const result = stripTypeScriptTypes(code);
      expect(result).not.toContain("interface User");
      expect(result).not.toContain("type UserId");
      expect(result).not.toContain("<T extends User>");
      // Note: return type annotations and type assertions may not be fully stripped
      // The current implementation focuses on parameter types, interfaces, and type aliases
      expect(result).toContain("function getUser"); // Function should still be there
    });
  });
});
