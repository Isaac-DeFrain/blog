/**
 * @module typescript-worker
 *
 * Web Worker for executing JavaScript code in a sandboxed environment.
 * Intercepts console methods and provides a render() function for visual output.
 */

/**
 * Message types for worker communication
 */
type WorkerMessage =
  | { type: "execute"; code: string }
  | { type: "output"; data: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * Sends a message to the main thread.
 */
function postMessageToMain(message: WorkerMessage): void {
  self.postMessage(message);
}

/**
 * Captures console output and sends it to the main thread.
 */
function setupConsoleCapture(): void {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  console.log = (...args: unknown[]) => {
    originalLog.apply(console, args);
    const output = args.map((arg) => String(arg)).join(" ");
    postMessageToMain({ type: "output", data: output });
  };

  console.error = (...args: unknown[]) => {
    originalError.apply(console, args);
    const output = `[ERROR] ${args.map((arg) => String(arg)).join(" ")}`;
    postMessageToMain({ type: "output", data: output });
  };

  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args);
    const output = `[WARN] ${args.map((arg) => String(arg)).join(" ")}`;
    postMessageToMain({ type: "output", data: output });
  };

  console.info = (...args: unknown[]) => {
    originalInfo.apply(console, args);
    const output = `[INFO] ${args.map((arg) => String(arg)).join(" ")}`;
    postMessageToMain({ type: "output", data: output });
  };
}

/**
 * Executes JavaScript code in the worker context.
 * Provides a render() function for visual output.
 *
 * @param code - The JavaScript code to execute
 */
async function executeCode(code: string): Promise<void> {
  setupConsoleCapture();

  // Create a render function that sends HTML to the main thread
  const render = (html: string) => {
    postMessageToMain({ type: "output", data: { html } });
  };

  try {
    // Wrap code in an async function to support top-level await
    // Execute the code using Function constructor for better isolation
    const wrappedCode = `
      return (async () => {
        ${code}
      })();
    `;

    const func = new Function("render", "console", wrappedCode);
    await func(render, console);

    // Send done message after execution completes successfully
    postMessageToMain({ type: "done" });
  } catch (error) {
    postMessageToMain({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle messages from the main thread.
 */
self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  const type = event.data.type;
  if (type === "execute") {
    const code = event.data.code;
    if (code) {
      executeCode(code).catch((error) => {
        postMessageToMain({
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }
});

// Export empty object to make this file a module for testing purposes
export {};
