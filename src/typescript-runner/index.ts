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

import { CodeExecutor } from "./CodeExecutor";
import { OutputRenderer } from "./OutputRenderer";
import { TypeScriptTransformer } from "./TypeScriptTransformer";
import { querySelectorAllSafe } from "../utils/dom";
import { SELECTORS, BUTTON_LABELS } from "../constants";

export { TypeScriptTransformer } from "./TypeScriptTransformer";
export { CodeExecutor } from "./CodeExecutor";
export { OutputRenderer } from "./OutputRenderer";

export const stripTypeScriptTypes = TypeScriptTransformer.stripTypeScriptTypes;
export const wrapTypeScriptCode = TypeScriptTransformer.wrapTypeScriptCode;
export const wrapJsCodeRun = TypeScriptTransformer.wrapJsCodeRun;

/**
 * Initializes executable TypeScript code blocks in the given container.
 * Attaches event listeners to run buttons and handles execution.
 *
 * @param container - The container element to search for executable blocks
 */
export async function initializeTypeScriptRunner(container: HTMLElement): Promise<void> {
  const executableBlocks = querySelectorAllSafe<HTMLElement>(container, SELECTORS.TS_EXECUTABLE_BLOCK);

  if (executableBlocks.length === 0) {
    return;
  }

  executableBlocks.forEach((block) => {
    const blockId = block.dataset.blockId;
    if (!blockId) return;

    const runButton = block.querySelector<HTMLButtonElement>(SELECTORS.TS_RUN_BUTTON(blockId));
    const outputContainer = block.querySelector<HTMLElement>(SELECTORS.TS_OUTPUT_CONTAINER(blockId));
    const outputContent = block.querySelector<HTMLElement>(SELECTORS.TS_OUTPUT_CONTENT);
    const codeScript = block.querySelector<HTMLScriptElement>(SELECTORS.TS_CODE_SCRIPT(blockId));

    if (!runButton || !outputContainer || !outputContent || !codeScript) return;

    // Ensure button text is set (for backwards compatibility with tests)
    if (!runButton.textContent || runButton.textContent.trim() === "") {
      runButton.textContent = BUTTON_LABELS.RUN;
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
      runButton.textContent = BUTTON_LABELS.RUNNING;

      // Clear previous output
      outputContainer.style.display = "block";
      outputContent.innerHTML = "";

      const appendOutput = OutputRenderer.createAppendOutput(outputContent);
      const appendError = OutputRenderer.createAppendError(outputContent);

      try {
        await CodeExecutor.executeCode(jsCode, appendOutput, appendError, () => {
          // Keep button disabled after execution
          runButton.disabled = true;
          runButton.textContent = BUTTON_LABELS.EXECUTED;
        });
      } catch (error) {
        // Handle compilation or execution errors
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        appendError(errorMessage);

        // Allow re-execution
        hasExecuted = false;
        runButton.disabled = false;
        runButton.textContent = BUTTON_LABELS.RUN;
      }
    });
  });
}
