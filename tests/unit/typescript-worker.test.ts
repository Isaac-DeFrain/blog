/**
 * Unit tests for TypeScript worker module.
 * Tests console capture, render function, and code execution in worker context.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock self.postMessage
let postMessageCalls: Array<{ type: string; data?: unknown; message?: string }> = [];

function mockPostMessage(message: { type: string; data?: unknown; message?: string }): void {
  postMessageCalls.push(message);
}

// Mock self.addEventListener
let messageHandlers: Array<(event: MessageEvent) => void> = [];

function mockAddEventListener(event: string, handler: (event: MessageEvent) => void): void {
  if (event === "message") {
    messageHandlers.push(handler);
  }
}

// Helper to trigger all message handlers
function triggerMessageHandlers(event: MessageEvent): void {
  for (const handler of messageHandlers) {
    handler(event);
  }
}

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

describe("typescript-worker", () => {
  beforeEach(() => {
    postMessageCalls = [];
    messageHandlers = [];

    // Mock self with proper setup
    (global as any).self = {
      postMessage: mockPostMessage,
      addEventListener: mockAddEventListener,
    };

    // Reset console mocks
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global as any).self;
    // Clear module cache to allow re-import
    vi.resetModules();
  });

  describe("console capture", () => {
    it("should capture console.log and send to main thread", async () => {
      // Import the worker module to trigger setup
      await import("../../src/typescript-worker");

      // Wait a bit for module to initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify handler was registered
      expect(messageHandlers.length).toBeGreaterThan(0);

      // Simulate execute message
      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.log('Hello World');" },
      } as MessageEvent;

      // Trigger message handler
      triggerMessageHandlers(executeMessage);

      // Wait for async execution - code needs time to run
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify console.log was captured
      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.length).toBeGreaterThan(0);
      expect(outputMessages.some((msg) => String(msg.data).includes("Hello World"))).toBe(true);
    });

    it("should capture console.error and send to main thread with [ERROR] prefix", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.error('Test error');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.some((msg) => String(msg.data).includes("[ERROR]"))).toBe(true);
      expect(outputMessages.some((msg) => String(msg.data).includes("Test error"))).toBe(true);
    });

    it("should capture console.warn and send to main thread with [WARN] prefix", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.warn('Test warning');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.some((msg) => String(msg.data).includes("[WARN]"))).toBe(true);
      expect(outputMessages.some((msg) => String(msg.data).includes("Test warning"))).toBe(true);
    });

    it("should capture console.info and send to main thread with [INFO] prefix", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.info('Test info');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.some((msg) => String(msg.data).includes("[INFO]"))).toBe(true);
      expect(outputMessages.some((msg) => String(msg.data).includes("Test info"))).toBe(true);
    });

    it("should handle multiple console.log arguments", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.log('Hello', 'World', 123);" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.length).toBeGreaterThan(0);
      const logMessage = outputMessages.find((msg) => String(msg.data).includes("Hello"));
      expect(logMessage).toBeDefined();
      expect(String(logMessage?.data)).toContain("World");
      expect(String(logMessage?.data)).toContain("123");
    });

    it("should preserve original console behavior", async () => {
      const logSpy = vi.spyOn(console, "log");
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.log('Test');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify original console.log was also called
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe("render function", () => {
    it("should send HTML output via render() function", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "render('<div>Hello</div>');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      const htmlMessage = outputMessages.find((msg) => msg.data && typeof msg.data === "object" && "html" in msg.data);
      expect(htmlMessage).toBeDefined();
      expect((htmlMessage?.data as { html: string })?.html).toBe("<div>Hello</div>");
    });

    it("should handle complex HTML in render()", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const html = "<div><p>Paragraph</p><span>Span</span></div>";
      const executeMessage: MessageEvent = {
        data: { type: "execute", code: `render('${html}');` },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      const htmlMessage = outputMessages.find((msg) => msg.data && typeof msg.data === "object" && "html" in msg.data);
      expect(htmlMessage).toBeDefined();
      expect((htmlMessage?.data as { html: string })?.html).toBe(html);
    });

    it("should allow multiple render() calls", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "render('<div>First</div>'); render('<div>Second</div>');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      const htmlMessages = outputMessages.filter(
        (msg) => msg.data && typeof msg.data === "object" && "html" in msg.data,
      );
      expect(htmlMessages.length).toBe(2);
    });
  });

  describe("code execution", () => {
    it("should execute simple JavaScript code", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "const x = 1 + 1; console.log(x);" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.some((msg) => String(msg.data).includes("2"))).toBe(true);
    });

    it("should support top-level await", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: {
          type: "execute",
          code: "await new Promise(resolve => setTimeout(() => { console.log('Done'); resolve(); }, 10));",
        },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.some((msg) => String(msg.data).includes("Done"))).toBe(true);

      const doneMessages = postMessageCalls.filter((msg) => msg.type === "done");
      expect(doneMessages.length).toBeGreaterThan(0);
    });

    it("should send done message after successful execution", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.log('Test');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const doneMessages = postMessageCalls.filter((msg) => msg.type === "done");
      expect(doneMessages.length).toBeGreaterThan(0);
    });

    it("should handle code that throws an error", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "throw new Error('Test error');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const errorMessages = postMessageCalls.filter((msg) => msg.type === "error");
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0].message).toBe("Test error");
    });

    it("should handle non-Error exceptions", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "throw 'String error';" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const errorMessages = postMessageCalls.filter((msg) => msg.type === "error");
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0].message).toBe("String error");
    });

    it("should handle code with undefined/null values", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "console.log(null, undefined);" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.length).toBeGreaterThan(0);
    });

    it("should handle empty code", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Empty code doesn't execute (worker checks `if (code)`)
      // So no done message should be sent
      const doneMessages = postMessageCalls.filter((msg) => msg.type === "done");
      expect(doneMessages.length).toBe(0);
    });
  });

  describe("message handling", () => {
    it("should ignore non-execute messages", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const otherMessage: MessageEvent = {
        data: { type: "other", code: "console.log('test');" },
      } as MessageEvent;

      triggerMessageHandlers(otherMessage);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have any output messages
      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.length).toBe(0);
    });

    it("should handle execute message without code", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // No code means no execution (worker checks `if (code)`)
      const doneMessages = postMessageCalls.filter((msg) => msg.type === "done");
      expect(doneMessages.length).toBe(0);
    });

    it("should handle multiple execute messages sequentially", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage1: MessageEvent = {
        data: { type: "execute", code: "console.log('First');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage1);

      await new Promise((resolve) => setTimeout(resolve, 100));

      postMessageCalls = []; // Clear for second execution

      const executeMessage2: MessageEvent = {
        data: { type: "execute", code: "console.log('Second');" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage2);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const outputMessages = postMessageCalls.filter((msg) => msg.type === "output");
      expect(outputMessages.some((msg) => String(msg.data).includes("Second"))).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should catch and report execution errors", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: { type: "execute", code: "undefinedFunction();" },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const errorMessages = postMessageCalls.filter((msg) => msg.type === "error");
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0].message).toBeDefined();
    });

    it("should handle promise rejections", async () => {
      await import("../../src/typescript-worker");
      await new Promise((resolve) => setTimeout(resolve, 10));

      const executeMessage: MessageEvent = {
        data: {
          type: "execute",
          code: "await Promise.reject(new Error('Promise error'));",
        },
      } as MessageEvent;

      triggerMessageHandlers(executeMessage);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const errorMessages = postMessageCalls.filter((msg) => msg.type === "error");
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
