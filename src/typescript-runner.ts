/**
 * @module typescript-runner
 *
 * TypeScript code execution module for executable code blocks in blog posts.
 * Compiles TypeScript to JavaScript and executes it in a Web Worker for sandboxing.
 *
 * Features:
 * - Compiles TypeScript using the TypeScript compiler loaded from CDN
 * - Executes code in a Web Worker for isolation
 * - Filters false-positive diagnostics for DOM globals (console, window, document, etc.)
 * - Supports ES2020 and DOM libraries
 * - Provides compilation diagnostics (errors and warnings)
 */

import { getBasePath } from "./utils";
import type * as ts from "typescript";

/**
 * Type for the TypeScript compiler loaded from CDN
 */
type TypeScriptCompiler = typeof ts;

/**
 * Loads the TypeScript compiler from CDN if not already loaded.
 *
 * @returns Promise that resolves when TypeScript is available
 */
async function loadTypeScript(): Promise<TypeScriptCompiler> {
  // @ts-expect-error - TypeScript will be available on window after loading
  if (window.ts) {
    // @ts-expect-error
    return window.ts;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/typescript@5.3.3/lib/typescript.js";
    script.onload = () => {
      // @ts-expect-error - TypeScript is now available on window
      if (window.ts) {
        // @ts-expect-error
        resolve(window.ts);
      } else {
        reject(new Error("TypeScript failed to load"));
      }
    };

    script.onerror = () => reject(new Error("Failed to load TypeScript compiler"));
    document.head.appendChild(script);
  });
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
      if (message.includes("Cannot find name") && knownDomGlobals.some(global => message.includes(`'${global}'`))) {
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

/**
 * Gets the worker script URL.
 * Uses Vite's ?url import to get the proper URL that works in both dev and production.
 *
 * @returns Promise that resolves to the worker script URL
 */
async function getWorkerScriptUrl(): Promise<string> {
  // Use Vite's ?url suffix to get the URL of the worker script
  // This ensures Vite handles bundling and path resolution correctly
  // @ts-expect-error - Vite's ?url import is not recognized by TypeScript
  const workerUrlModule = await import("./typescript-worker.ts?url");
  const workerUrl = workerUrlModule.default;

  // Apply base path if needed (Vite's ?url should already handle this, but just in case)
  const basePath = getBasePath();
  if (basePath !== "/" && !workerUrl.startsWith(basePath)) {
    // Ensure the URL includes the base path
    const url = new URL(workerUrl, window.location.href);
    return `${basePath}${url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname}`;
  }

  return workerUrl;
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
 * Initializes executable TypeScript code blocks in the given container.
 * Attaches event listeners to run buttons and handles execution.
 *
 * @param container - The container element to search for executable blocks
 */
export function initializeTypeScriptRunner(container: HTMLElement): void {
  const executableBlocks = container.querySelectorAll(".ts-executable-block");

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

    const tsCode = JSON.parse(codeScript.textContent || "");

    runButton.addEventListener("click", async () => {
      // Disable button during execution
      runButton.disabled = true;
      runButton.textContent = "Running...";

      // Clear previous output
      outputContainer.style.display = "block";
      outputContent.innerHTML = "";

      try {
        // Compile TypeScript
        const { jsCode, diagnostics } = await compileTypeScript(tsCode);

        // Show compilation diagnostics if any
        if (diagnostics.length > 0) {
          const diagnosticsDiv = document.createElement("div");
          diagnosticsDiv.className = "ts-diagnostics";
          diagnosticsDiv.innerHTML = `<strong>Compilation warnings/errors:</strong><pre>${diagnostics.join("\n")}</pre>`;
          outputContent.appendChild(diagnosticsDiv);
        }

        // Execute in worker
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
            // Handle error
            const errorDiv = document.createElement("div");
            errorDiv.className = "ts-error";
            errorDiv.textContent = errorMessage;
            outputContent.appendChild(errorDiv);
          },
          () => {
            // Execution done
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
