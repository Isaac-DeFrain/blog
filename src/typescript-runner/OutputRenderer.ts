/**
 * @module typescript-runner/OutputRenderer
 *
 * Renders output and errors to the DOM for TypeScript executable blocks.
 */

import { CSS_CLASSES } from "../constants";

/**
 * Renders output and errors to the DOM.
 */
export class OutputRenderer {
  /**
   * Sets the content of an output div element based on the data type.
   * Handles string output, HTML output (from render() function), and other types (as JSON).
   *
   * @param data - The output data to display
   * @param outputDiv - The div element to set content on
   */
  private static setOutputDivContent(data: unknown, outputDiv: HTMLDivElement): void {
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
   * @param outputContent - The container element to append the output to
   * @returns Function that appends output data to the container
   */
  static createAppendOutput(outputContent: HTMLElement): (data: unknown) => void {
    return (data: unknown): void => {
      const outputDiv = document.createElement("div");
      outputDiv.className = CSS_CLASSES.TS_OUTPUT_ITEM;
      this.setOutputDivContent(data, outputDiv);
      outputContent.appendChild(outputDiv);
    };
  }

  /**
   * Creates and appends an error element to the output container.
   *
   * @param outputContent - The container element to append the error to
   * @returns Function that appends error messages to the container
   */
  static createAppendError(outputContent: HTMLElement): (errorMessage: string) => void {
    return (errorMessage: string): void => {
      const errorDiv = document.createElement("div");
      errorDiv.className = CSS_CLASSES.TS_ERROR;
      errorDiv.textContent = errorMessage;
      outputContent.appendChild(errorDiv);
    };
  }
}
