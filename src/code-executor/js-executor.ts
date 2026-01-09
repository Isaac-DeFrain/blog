/**
 * @module typescript-runner/js-executor
 *
 * Executes JavaScript code with stdout/stderr hooks and timeout handling.
 */

import { CodeExecutionTimeoutError, InvalidCodeError } from "../utils/errors";
import { TIMEOUTS, ERROR_MESSAGES } from "../blog/constants";

/**
 * Executes JavaScript code with hooks and error handling.
 */
export class JsCodeExecutor {
  /**
   * Wraps JavaScript code to add stdout/stderr console hooks.
   *
   * @param jsCode - The JavaScript code containing the run() function
   * @returns The wrapped function code as a string
   * @throws InvalidCodeError if code doesn't contain run() function
   */
  private static wrapJsCodeToRunWithHooks(jsCode: string): string {
    if (!jsCode.match(/^(function run\(stdout, stderr\) \{[\s\S]*?\})$/)) {
      throw new InvalidCodeError(ERROR_MESSAGES.INVALID_WRAPPED_CODE);
    }

    return `
    ${jsCode}
    
    // Console hooks
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Helper functions
    const stringifyArgs = (args) => args.map((arg) => String(arg)).join(" ");
    const isNonNullObject = (args) => {
      let isSingleArg = args.length === 1;
      let isObject = typeof args[0] === "object" && args[0] !== null;
      return isSingleArg && isObject;
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      // If single argument and it's an object/array, pass it through for proper JSON formatting
      // Otherwise, join multiple arguments as strings
      if (isNonNullObject(args)) {
        stdout(args[0]);
      } else {
        const output = args.map((arg) => String(arg)).join(" ");
        stdout(output);
      }
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      const output = \`[ERROR] \${stringifyArgs(args)}\`;
      stderr(output);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      const output = \`[WARN] \${stringifyArgs(args)}\`;
      stdout(output);
    };

    console.info = (...args) => {
      originalInfo.apply(console, args);
      const output = \`[INFO] \${stringifyArgs(args)}\`;
      stdout(output);
    };

    // Provide a render function for HTML output
    const render = (html) => {
      stdout({ html });
    };

    // Execute the run function with hooks
    return (async () => {
      await run(stdout, stderr);
    })();
  `;
  }

  /**
   * Executes JavaScript code directly with stdout/stderr hooks.
   *
   * @param jsCode - The JavaScript code to execute
   * @param onOutput - Callback for output messages
   * @param onError - Callback for errors
   * @param onDone - Callback when execution completes
   * @returns Promise that resolves when execution completes
   */
  static async executeCode(
    jsCode: string,
    onOutput: (data: unknown) => void,
    onError: (message: string) => void,
    onDone: () => void,
  ): Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const clearTimeoutIfSet = (): void => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };
    const clearTimeoutOnError = (message: string): void => {
      clearTimeoutIfSet();
      onError(message);
    };

    try {
      const wrappedJsCode = this.wrapJsCodeToRunWithHooks(jsCode);
      timeout = setTimeout(() => {
        const timeoutError = new CodeExecutionTimeoutError(TIMEOUTS.CODE_EXECUTION);
        onError(timeoutError.message);
        onDone();
      }, TIMEOUTS.CODE_EXECUTION);

      const execute = new Function("stdout", "stderr", wrappedJsCode);
      await execute(onOutput, clearTimeoutOnError);

      clearTimeoutIfSet();
      onDone();
    } catch (error) {
      clearTimeoutIfSet();
      onError(error instanceof Error ? error.message : String(error));
      onDone();
    }
  }
}
