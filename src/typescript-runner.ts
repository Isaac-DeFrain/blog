/**
 * @module typescript-runner
 *
 * TypeScript code execution module for executable code blocks in blog posts.
 * Compiles TypeScript to JavaScript and executes it in a Web Worker for sandboxing.
 *
 * Features:
 * - Compiles TypeScript using the bundled TypeScript compiler
 * - Executes code in a Web Worker for isolation
 * - Filters false-positive diagnostics for DOM globals (console, window, document, etc.)
 * - Supports ES2020 and DOM libraries
 * - Provides compilation diagnostics (errors and warnings)
 */

import { getBasePath } from "./utils";
import type * as ts from "typescript";

/**
 * Type for the TypeScript compiler
 */
type TypeScriptCompiler = typeof ts;

/**
 * Loads the TypeScript compiler from the bundled module.
 * Caches the result on window.ts for subsequent calls.
 *
 * @returns Promise that resolves when TypeScript is available
 */
async function loadTypeScript(): Promise<TypeScriptCompiler> {
  // Check if already cached on window
  // @ts-expect-error - TypeScript may be cached on window
  if (window.ts) {
    // @ts-expect-error
    return window.ts;
  }

  try {
    // Dynamically import TypeScript compiler (bundled by Vite)
    const tsModule = await import("typescript");

    // Cache on window for subsequent calls
    // @ts-expect-error - Storing TypeScript on window for caching
    window.ts = tsModule;

    return tsModule as TypeScriptCompiler;
  } catch (error) {
    throw new Error(`Failed to load TypeScript compiler: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Compiles TypeScript code to JavaScript.
 *
 * Uses a custom compiler host for browser environment and filters out false-positive
 * diagnostics for DOM globals that exist at runtime but can't be resolved during compilation.
 *
 * @param tsCode - The TypeScript source code
 * @returns Object with compiled JavaScript code and any diagnostics (filtered)
 */
async function compileTypeScript(tsCode: string): Promise<{ jsCode: string; diagnostics: string[] }> {
  const ts = await loadTypeScript();
  const diagnostics: string[] = [];

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    lib: ["ES2020", "DOM"],
    strict: false,
    esModuleInterop: true,
    skipLibCheck: true,
  };

  // Compile TypeScript to JavaScript
  const result = ts.transpile(tsCode, compilerOptions);

  // Create source file for diagnostics
  const sourceFile = ts.createSourceFile("temp.ts", tsCode, ts.ScriptTarget.ES2020, true);

  // Create a minimal compiler host for browser environment
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName: string) => {
      if (fileName === "temp.ts") {
        return sourceFile;
      }
      return undefined;
    },
    writeFile: () => {
      // No-op in browser
    },
    getCurrentDirectory: () => "/",
    getDirectories: () => [],
    fileExists: (fileName: string) => fileName === "temp.ts",
    readFile: (fileName: string) => {
      if (fileName === "temp.ts") {
        return tsCode;
      }
      return undefined;
    },
    getCanonicalFileName: (fileName: string) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    getDefaultLibFileName: () => "lib.d.ts", // Return a simple string since skipLibCheck is true
  };

  // Get diagnostics (warnings/errors)
  const program = ts.createProgram(["temp.ts"], compilerOptions, compilerHost);
  const semanticDiagnostics = ts.getPreEmitDiagnostics(program);

  // Known DOM globals that exist at runtime but TypeScript can't resolve in browser environment
  const knownDomGlobals = ["console", "window", "document", "navigator", "location", "localStorage", "sessionStorage"];

  for (const diagnostic of semanticDiagnostics) {
    if (diagnostic.file && diagnostic.file === sourceFile) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

      // Filter out false positives about missing DOM globals
      // These exist at runtime in the browser, so we suppress the errors
      if (message.includes("Cannot find name") && knownDomGlobals.some((global) => message.includes(`'${global}'`))) {
        continue;
      }

      const category = diagnostic.category === ts.DiagnosticCategory.Error ? "Error" : "Warning";
      diagnostics.push(`${category}: ${message}`);
    }
  }

  return {
    jsCode: result,
    diagnostics,
  };
}

// Cache for worker script URL to avoid re-fetching
let cachedWorkerScriptUrl: string | null = null;

/**
 * Gets the worker script URL.
 * Uses Vite's ?url import to get the proper URL that works in both dev and production.
 *
 * @returns Promise that resolves to the worker script URL
 */
async function getWorkerScriptUrl(): Promise<string> {
  if (cachedWorkerScriptUrl !== null) {
    return cachedWorkerScriptUrl;
  }

  // Use Vite's ?url suffix to get the URL of the worker script
  // This ensures Vite handles bundling and path resolution correctly
  // @ts-expect-error - Vite's ?url import is not recognized by TypeScript
  const workerUrlModule = await import("./typescript-worker.ts?url");
  const workerUrl = workerUrlModule.default;

  // Apply base path if needed (Vite's ?url should already handle this, but just in case)
  const basePath = getBasePath();
  if (basePath !== "/" && !workerUrl.startsWith(basePath)) {
    // Ensure the URL includes the base path
    // Use a fallback base URL if window.location is not available (e.g., in test environments)
    const baseUrl = typeof window !== "undefined" && window.location ? window.location.href : "http://localhost/";
    const url = new URL(workerUrl, baseUrl);
    const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    cachedWorkerScriptUrl = `${basePath}${pathname}`;
  } else {
    cachedWorkerScriptUrl = workerUrl;
  }

  return cachedWorkerScriptUrl as string;
}

/**
 * Executes JavaScript code in a Web Worker.
 *
 * @param jsCode - The JavaScript code to execute
 * @param onOutput - Callback for output messages
 * @param onError - Callback for errors
 * @param onDone - Callback when execution completes
 * @returns Promise that resolves when execution starts
 */
async function executeInWorker(
  jsCode: string,
  onOutput: (data: unknown) => void,
  onError: (message: string) => void,
  onDone: () => void,
): Promise<void> {
  const workerUrl = await getWorkerScriptUrl();
  const worker = new Worker(workerUrl, { type: "module" });

  const timeout = setTimeout(() => {
    worker.terminate();
    onError("Execution timeout: Code took too long to execute");
  }, 10000); // 10 second timeout

  worker.onmessage = (event) => {
    const { type, data, message } = event.data;

    switch (type) {
      case "output":
        onOutput(data);
        break;
      case "error":
        clearTimeout(timeout);
        worker.terminate();
        onError(message || "Unknown error occurred");
        break;
      case "done":
        clearTimeout(timeout);
        worker.terminate();
        onDone();
        break;
    }
  };

  worker.onerror = (error) => {
    clearTimeout(timeout);
    worker.terminate();
    onError(`Worker error: ${error.message}`);
  };

  worker.postMessage({ type: "execute", code: jsCode });
}

/**
 * Preloads TypeScript execution dependencies.
 * Loads the TypeScript compiler module and resolves the worker script URL in parallel.
 * This should be called as early as possible when a post with executable TypeScript blocks is detected.
 *
 * @returns Promise that resolves when all dependencies are loaded
 */
export async function preloadTypeScriptDependencies(): Promise<void> {
  await Promise.all([loadTypeScript(), getWorkerScriptUrl()]);
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

    const tsCode = JSON.parse(codeScript.textContent || "");
    runButton.addEventListener("click", async () => {
      // Disable button during execution
      runButton.disabled = true;
      runButton.textContent = "Running...";

      // Clear previous output
      outputContainer.style.display = "block";
      outputContent.innerHTML = "";

      try {
        const { jsCode, diagnostics } = await compileTypeScript(tsCode);

        // Show compilation diagnostics if any
        if (diagnostics.length > 0) {
          const diagnosticsDiv = document.createElement("div");
          diagnosticsDiv.className = "ts-diagnostics";
          diagnosticsDiv.innerHTML = `<strong>Compilation warnings/errors:</strong><pre>${diagnostics.join("\n")}</pre>`;
          outputContent.appendChild(diagnosticsDiv);
        }

        await executeInWorker(
          jsCode,
          (data) => {
            // Handle output
            const outputDiv = document.createElement("div");
            outputDiv.className = "ts-output-item";

            if (typeof data === "string") {
              // Plain text output
              outputDiv.textContent = data;
            } else if (data && typeof data === "object" && "html" in data) {
              // HTML output from render() function
              outputDiv.innerHTML = data.html as string;
            } else {
              // JSON output for other types
              outputDiv.textContent = JSON.stringify(data, null, 2);
            }

            outputContent.appendChild(outputDiv);
          },
          (errorMessage) => {
            const errorDiv = document.createElement("div");
            errorDiv.className = "ts-error";
            errorDiv.textContent = errorMessage;
            outputContent.appendChild(errorDiv);
          },
          () => {
            runButton.disabled = false;
            runButton.textContent = "Run";
          },
        );
      } catch (error) {
        // Handle compilation or execution errors
        const errorDiv = document.createElement("div");
        errorDiv.className = "ts-error";
        errorDiv.textContent = error instanceof Error ? error.message : "Unknown error occurred";

        outputContent.appendChild(errorDiv);

        runButton.disabled = false;
        runButton.textContent = "Run";
      }
    });
  });
}
