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

  console.log(`\n=== ${title} ===\n`);

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

// Mock localStorage to track all operations
export const localStorageMock = (() => {
  const store: Record<string, string> = {};
  const operations: Array<{ type: string; key: string; value?: string }> = [];

  return {
    getItem: (key: string): string | null => {
      operations.push({ type: "get", key });
      return store[key] || null;
    },
    setItem: (key: string, value: string): void => {
      operations.push({ type: "set", key, value });
      store[key] = value;
    },
    removeItem: (key: string): void => {
      operations.push({ type: "remove", key });
      delete store[key];
    },
    clear: (): void => {
      operations.push({ type: "clear", key: "" });
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    getAllKeys: (): string[] => Object.keys(store),
    getOperations: (): typeof operations => [...operations],
    resetOperations: (): void => {
      operations.length = 0;
    },
  };
})();

/**
 * Helper function to count blog post cache entries in localStorage
 */
export function countBlogPostCacheEntries(localStorage: typeof localStorageMock): number {
  const keys = localStorage.getAllKeys();
  return keys.filter((key) => key.startsWith("blog-post-")).length;
}

/**
 * Helper function to check if a specific post is cached
 */
export function isPostCached(postId: string, localStorage: typeof localStorageMock): boolean {
  const cacheKey = `blog-post-${postId}`;
  return localStorage.getItem(cacheKey) !== null;
}
