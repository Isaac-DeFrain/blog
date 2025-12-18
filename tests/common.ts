/**
 * Common utilities and types for test files
 */

export interface Manifest {
  files: string[];
}

export interface TestResults {
  errors: string[];
  warnings?: string[];
}

export interface ReportOptions {
  title: string;
  successMessage?: string;
}

/**
 * Validates that a date string is in YYYY-MM-DD format
 */
export function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Reports test results to console with a custom title
 */
export function reportResults(results: TestResults, options: string | ReportOptions): void {
  const title = typeof options === "string" ? options : options.title;
  const defaultSuccessMessage = "✅ All tests passed!";
  const successMessage =
    typeof options === "string" ? defaultSuccessMessage : options.successMessage || defaultSuccessMessage;

  console.log(`=== ${title} ===\n`);

  if (results.errors.length === 0 && (!results.warnings || results.warnings.length === 0)) {
    console.log(`${successMessage}\n`);
    return;
  }

  if (results.errors.length > 0) {
    console.error(`❌ Found ${results.errors.length} error(s):\n`);
    results.errors.forEach((error) => {
      console.error(`  - ${error}`);
    });

    console.error("");
  }

  if (results.warnings && results.warnings.length > 0) {
    console.warn(`⚠️  Found ${results.warnings.length} warning(s):\n`);
    results.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });

    console.warn("");
  }
}

/**
 * Exits the process with error code if there are errors
 */
export function exitIfErrors(errors: string[]): void {
  if (errors.length > 0) {
    process.exit(1);
  }
}
