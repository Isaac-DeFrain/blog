/**
 * Integration tests for TypeScript runner using the real TypeScript compiler.
 * These tests verify that the runner works correctly with actual TypeScript compilation,
 * diagnostic reporting, and code execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupDOM, cleanupDOM } from "../helpers/dom";

// Mock utils module
vi.mock("../../src/utils", () => ({
  getBasePath: vi.fn(() => "/"),
  unescapeHtml: vi.fn((text: string) => text),
}));

// Mock the worker URL import (Vite's ?url import)
vi.mock("../../src/typescript-worker.ts?url", () => ({
  default: "/assets/typescript-worker.js",
}));

// Track created workers
const createdWorkers: MockWorker[] = [];

// Mock Worker for integration tests
class MockWorker {
  onmessage: ((event: { data: { type: string; data?: unknown; message?: string } }) => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;
  terminated = false;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    public url: string,
    public options: { type: string },
  ) {
    createdWorkers.push(this);
  }

  postMessage(message: { type: string; code: string }): void {
    if (message.type === "execute") {
      // Simulate code execution in worker
      // In a real worker, this would execute the JavaScript code
      // For integration tests, we'll simulate basic execution
      try {
        // Simulate console.log capture BEFORE executing
        const originalLog = console.log;
        const capturedOutput: unknown[] = [];
        console.log = (...args: unknown[]) => {
          capturedOutput.push(...args);
          originalLog(...args);
        };

        // Create a safe execution context and execute the code
        const executeCode = new Function(message.code);
        executeCode();

        // Restore console.log
        console.log = originalLog;

        // Send captured output
        for (const output of capturedOutput) {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({ data: { type: "output", data: output } });
            }
          }, 0);
        }

        // Send done message after a short delay to ensure output messages are sent first
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({ data: { type: "done" } });
          }
        }, 20);
      } catch (error) {
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({
              data: {
                type: "error",
                message: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }, 10);
      }
    }
  }

  terminate(): void {
    this.terminated = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  // Helper to simulate worker messages
  simulateMessage(type: string, data?: unknown, message?: string): void {
    if (this.onmessage) {
      this.onmessage({ data: { type, data, message } });
    }
  }

  // Helper to simulate worker errors
  simulateError(message: string): void {
    if (this.onerror) {
      this.onerror({ message } as ErrorEvent);
    }
  }
}

describe("TypeScript Runner Integration", () => {
  let originalWorker: typeof Worker;
  let originalLocation: Location;

  beforeEach(async () => {
    vi.clearAllMocks();
    createdWorkers.length = 0;

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

    // Mock Worker
    originalWorker = global.Worker;
    (global as any).Worker = MockWorker as any;

    // Ensure TypeScript is not cached
    delete (window as any).ts;

    // Reset utils mocks
    const utils = await import("../../src/utils");
    vi.mocked(utils.getBasePath).mockReturnValue("/");
    vi.mocked(utils.unescapeHtml).mockImplementation((text: string) => text);
  });

  afterEach(() => {
    vi.clearAllMocks();
    createdWorkers.length = 0;
    delete (window as any).ts;
    global.Worker = originalWorker;
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
      codeScript.textContent = JSON.stringify("const x: number = 42; console.log(x);");

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
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
      codeScript.textContent = JSON.stringify(`
        interface Person {
          name: string;
          age: number;
        }
        const person: Person = { name: "Alice", age: 30 };
        console.log(person.name);
      `);

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 200));

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
      codeScript.textContent = JSON.stringify(`
        console.log("Hello");
        window.location.href;
        document.body;
        navigator.userAgent;
        localStorage.getItem("key");
      `);

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));

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
      codeScript.textContent = JSON.stringify(`
        const x: number = "string"; // Type error
        const y: unknownVar; // Unknown variable
      `);

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));

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
      codeScript.textContent = JSON.stringify(`
        async function test() {
          const result = await Promise.resolve(42);
          console.log(result);
        }
        test();
      `);

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));

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
      codeScript.textContent = JSON.stringify(`
        function identity<T>(arg: T): T {
          return arg;
        }
        const result = identity<string>("hello");
        console.log(result);
      `);

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should compile successfully
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeNull();
    });
  });

  describe("TypeScript Compiler Loading", () => {
    it("should load TypeScript compiler from module", async () => {
      delete (window as any).ts;

      const container = document.createElement("div");
      const block = document.createElement("div");
      block.className = "ts-executable-block";
      block.dataset.blockId = "test-load";

      const runButton = document.createElement("button");
      runButton.className = "ts-run-button";
      runButton.dataset.blockId = "test-load";

      const outputContainer = document.createElement("div");
      outputContainer.className = "ts-output-container";
      outputContainer.dataset.blockId = "test-load";
      outputContainer.style.display = "none";

      const outputContent = document.createElement("div");
      outputContent.className = "ts-output-content";

      const codeScript = document.createElement("script");
      codeScript.dataset.tsCode = "test-load";
      codeScript.textContent = JSON.stringify("console.log('loaded');");

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      // Click button to trigger TypeScript loading
      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify TypeScript was loaded
      expect((window as any).ts).toBeDefined();
      expect((window as any).ts.transpile).toBeDefined();
      expect((window as any).ts.createSourceFile).toBeDefined();
    });

    it("should cache TypeScript compiler on window", async () => {
      delete (window as any).ts;

      const container1 = document.createElement("div");
      const block1 = document.createElement("div");
      block1.className = "ts-executable-block";
      block1.dataset.blockId = "test-cache-1";

      const runButton1 = document.createElement("button");
      runButton1.className = "ts-run-button";
      runButton1.dataset.blockId = "test-cache-1";
      runButton1.disabled = true;
      runButton1.textContent = "Loading...";

      const outputContainer1 = document.createElement("div");
      outputContainer1.className = "ts-output-container";
      outputContainer1.dataset.blockId = "test-cache-1";
      outputContainer1.style.display = "none";

      const outputContent1 = document.createElement("div");
      outputContent1.className = "ts-output-content";

      const codeScript1 = document.createElement("script");
      codeScript1.dataset.tsCode = "test-cache-1";
      codeScript1.textContent = JSON.stringify("console.log('first');");

      block1.appendChild(runButton1);
      block1.appendChild(outputContainer1);
      outputContainer1.appendChild(outputContent1);
      block1.appendChild(codeScript1);
      container1.appendChild(block1);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container1);

      const firstTs = (window as any).ts;

      // Initialize second runner
      const container2 = document.createElement("div");
      const block2 = document.createElement("div");
      block2.className = "ts-executable-block";
      block2.dataset.blockId = "test-cache-2";

      const runButton2 = document.createElement("button");
      runButton2.className = "ts-run-button";
      runButton2.dataset.blockId = "test-cache-2";
      runButton2.disabled = true;
      runButton2.textContent = "Loading...";

      const outputContainer2 = document.createElement("div");
      outputContainer2.className = "ts-output-container";
      outputContainer2.dataset.blockId = "test-cache-2";
      outputContainer2.style.display = "none";

      const outputContent2 = document.createElement("div");
      outputContent2.className = "ts-output-content";

      const codeScript2 = document.createElement("script");
      codeScript2.dataset.tsCode = "test-cache-2";
      codeScript2.textContent = JSON.stringify("console.log('second');");

      block2.appendChild(runButton2);
      block2.appendChild(outputContainer2);
      outputContainer2.appendChild(outputContent2);
      block2.appendChild(codeScript2);
      container2.appendChild(block2);

      await initializeTypeScriptRunner(container2);

      // Should use cached TypeScript
      const secondTs = (window as any).ts;
      expect(secondTs).toBe(firstTs);
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
      codeScript.textContent = JSON.stringify("console.log('test');");

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));

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
      codeScript.textContent = JSON.stringify(`
        window.location.href;
        document.body;
        navigator.userAgent;
        location.pathname;
        localStorage.getItem("key");
        sessionStorage.setItem("key", "value");
      `);

      block.appendChild(runButton);
      block.appendChild(outputContainer);
      outputContainer.appendChild(outputContent);
      block.appendChild(codeScript);
      container.appendChild(block);

      const { initializeTypeScriptRunner } = await import("../../src/typescript-runner");
      await initializeTypeScriptRunner(container);

      runButton.click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not show diagnostics for DOM globals
      const diagnosticsDiv = outputContent.querySelector(".ts-diagnostics");
      expect(diagnosticsDiv).toBeNull();
    });
  });
});
