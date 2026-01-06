/**
 * @module typescript-runner
 *
 * TypeScript code execution module for executable code blocks in blog posts.
 *
 * The code is known at compilation time (it's in the blog post markdown), so we process
 * it at build time and make execution lazy by putting it behind a function call.
 *
 * Build time (in blog.ts):
 * - Strips TypeScript type annotations to convert to JavaScript
 * - Wraps code in a run() function
 * - Stores the pre-processed function in the HTML
 *
 * Runtime (when run button is clicked):
 * - Extracts the pre-processed function
 * - Adds stdout/stderr hooks and console overrides
 * - Executes the function lazily
 */

/**
 * Strips TypeScript type annotations from code to convert it to JavaScript.
 * This is a simple approach that handles common cases but may not cover all TypeScript features.
 *
 * @param tsCode - The TypeScript source code
 * @returns JavaScript code with type annotations removed
 */
export function stripTypeScriptTypes(tsCode: string): string {
  let jsCode = tsCode;

  // Remove type annotations from function parameters: (x: number) => (x)
  jsCode = jsCode.replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*(?=\s*[,)])/g, "");

  // Remove type annotations from variable declarations: const x: number = -> const x =
  jsCode = jsCode.replace(/:\s*[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*(?=\s*[=,;])/g, "");

  // Remove type assertions: as Type -> (empty)
  jsCode = jsCode.replace(/\s+as\s+[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*/g, "");

  // Remove interface declarations (multiline)
  jsCode = jsCode.replace(/interface\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\{[^}]*\}/g, "");

  // Remove type aliases: type X = ...
  jsCode = jsCode.replace(/type\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*[^;]+;/g, "");

  // Remove generic type parameters from function declarations: <T> -> (empty)
  jsCode = jsCode.replace(/<[A-Za-z_$][A-Za-z0-9_$<>[\]|&\s,.]*>(?=\s*\()/g, "");

  return jsCode;
}

/**
 * Wraps TypeScript code in a run() function and converts it to JavaScript.
 * This is called at build time when processing markdown.
 *
 * @param tsCode - The TypeScript source code to wrap and convert
 * @returns The JavaScript code with run() function
 */
export function wrapTypeScriptCode(tsCode: string): string {
  const jsCode = stripTypeScriptTypes(tsCode);
  return wrapJsCodeRun(jsCode);
}

export function wrapJsCodeRun(jsCode: string): string {
  return `function run(stdout, stderr) {\n${jsCode}\n}`;
}

/**
 * Wraps JavaScript code to add stdout/stderr console hooks.
 *
 * @param jsCode - The JavaScript code containing the run() function
 * @returns The wrapped function code as a string
 */
function wrapJsCodeToRunWithHooks(jsCode: string): string {
  if (!jsCode.match(/^(function run\(stdout, stderr\) \{[\s\S]*?\})$/)) {
    throw new Error("Invalid wrapped JavaScript code: missing run() function");
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
 * Initializes executable TypeScript code blocks in the given container.
 * Attaches event listeners to run buttons and handles execution.
 *
 * @param container - The container element to search for executable blocks
 */
export async function initializeTypeScriptRunner(container: HTMLElement): Promise<void> {
  const executableBlocks = container.querySelectorAll(".ts-executable-block");

  if (executableBlocks.length === 0) {
    return;
  }

  executableBlocks.forEach((block) => {
    const blockElement = block as HTMLElement;
    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const runButton = blockElement.querySelector(`.ts-run-button[data-block-id="${blockId}"]`) as HTMLButtonElement;
    const outputContainer = blockElement.querySelector(
      `.ts-output-container[data-block-id="${blockId}"]`,
    ) as HTMLElement;
    const outputContent = blockElement.querySelector(`.ts-output-content`) as HTMLElement;
    const codeScript = blockElement.querySelector(`script[data-ts-code="${blockId}"]`) as HTMLScriptElement;

    if (!runButton || !outputContainer || !outputContent || !codeScript) return;

    // Ensure button text is set (for backwards compatibility with tests)
    if (!runButton.textContent || runButton.textContent.trim() === "") {
      runButton.textContent = "Run";
    }

    // The code is already processed at build time (stripped of types and wrapped in run())
    // We just need to execute it lazily when the button is clicked
    const jsCode = JSON.parse(codeScript.textContent || "");

    let hasExecuted = false;

    runButton.addEventListener("click", async () => {
      // Prevent execution if already executed
      if (hasExecuted) {
        return;
      }

      // Mark as executed immediately to prevent multiple clicks
      hasExecuted = true;

      // Disable button during execution
      runButton.disabled = true;
      runButton.textContent = "Running...";

      // Clear previous output
      outputContainer.style.display = "block";
      outputContent.innerHTML = "";

      try {
        await executeCode(jsCode, appendOutput(outputContent), appendError(outputContent), () => {
          // Keep button disabled after execution
          runButton.disabled = true;
          runButton.textContent = "Executed";
        });
      } catch (error) {
        // Handle compilation or execution errors
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        appendError(outputContent)(errorMessage);

        // Allow re-execution
        runButton.disabled = false;
        runButton.textContent = "Run";
      }
    });
  });
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
async function executeCode(
  jsCode: string,
  onOutput: (data: unknown) => void,
  onError: (message: string) => void,
  onDone: () => void,
): Promise<void> {
  const tenSecTimeout = 10000;
  const wrappedCode = wrapJsCodeToRunWithHooks(jsCode);

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
    timeout = setTimeout(() => {
      onError("Execution timeout: Code took too long to execute");
      onDone();
    }, tenSecTimeout);

    const execute = new Function("stdout", "stderr", wrappedCode);
    await execute(onOutput, clearTimeoutOnError);

    clearTimeoutIfSet();
    onDone();
  } catch (error) {
    clearTimeoutIfSet();
    onError(error instanceof Error ? error.message : String(error));
    onDone();
  }
}

/**
 * Sets the content of an output div element based on the data type.
 * Handles string output, HTML output (from render() function), and other types (as JSON).
 *
 * @param data - The output data to display
 * @param outputDiv - The div element to set content on
 */
function setOutputDivContent(data: unknown, outputDiv: HTMLDivElement): void {
  if (typeof data === "string") {
    // Plain text output
    outputDiv.textContent = data;
  } else if (data && typeof data === "object" && "html" in data) {
    // HTML output from render() function
    outputDiv.innerHTML = data.html as string;
  } else {
    // JSON output for other types
    try {
      // Replacer function to handle BigInt values
      const replacer = (_key: string, value: unknown): unknown => {
        if (typeof value === "bigint") {
          return `${value}n`;
        }
        return value;
      };
      outputDiv.textContent = JSON.stringify(data, replacer, 2);
    } catch (error) {
      // Fallback for circular references or other serialization errors
      outputDiv.textContent = String(data);
    }
  }
}

/**
 * Creates and appends an output element to the output container based on the data type.
 * Handles string output, HTML output (from render() function), and other types (as JSON).
 *
 * @param data - The output data to display
 * @param outputContent - The container element to append the output to
 */
const appendOutput =
  (outputContent: HTMLElement) =>
  (data: unknown): void => {
    const outputDiv = document.createElement("div");
    outputDiv.className = "ts-output-item";
    setOutputDivContent(data, outputDiv);
    outputContent.appendChild(outputDiv);
  };

/**
 * Creates and appends an error element to the output container.
 *
 * @param errorMessage - The error message to display
 * @param outputContent - The container element to append the error to
 */
const appendError =
  (outputContent: HTMLElement) =>
  (errorMessage: string): void => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "ts-error";
    errorDiv.textContent = errorMessage;
    outputContent.appendChild(errorDiv);
  };
