/**
 * @module errors
 *
 * Custom error classes for the blog application with consistent error handling.
 */

/**
 * Error message prefixes used by custom error classes.
 * These prefixes are prepended to error messages for consistent formatting.
 */
export const ERROR_PREFIXES = {
  POST_NOT_FOUND_ERROR: "Blog post not found",
  POST_LOAD_ERROR: "Failed to load blog post",
  MANIFEST_LOAD_ERROR: "Failed to load blog manifest",
  RENDERING_ERROR: "Rendering failed",
  CODE_EXECUTION_TIMEOUT_ERROR: "Code execution timeout",
  INVALID_CODE_ERROR: "Invalid code",
};

/**
 * Base error class for blog-related errors.
 */
export class BlogError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  getMessagePrefix(): string {
    return this.message.split(":")[0];
  }
}

/**
 * Error thrown when a blog post is not found.
 */
export class PostNotFoundError extends BlogError {
  constructor(postId: string, context?: Record<string, unknown>) {
    super(`${ERROR_PREFIXES.POST_NOT_FOUND_ERROR}: ${postId}`, { postId, ...context });
  }
}

/**
 * Error thrown when blog post content fails to load.
 */
export class PostLoadError extends BlogError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`${ERROR_PREFIXES.POST_LOAD_ERROR}: ${message}`, context);
  }
}

/**
 * Error thrown when the blog manifest fails to load.
 */
export class ManifestLoadError extends BlogError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(`${ERROR_PREFIXES.MANIFEST_LOAD_ERROR}${message ? `: ${message}` : ""}`, context);
  }
}

/**
 * Error thrown when blog post content fails to render.
 */
export class RenderingError extends BlogError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`${ERROR_PREFIXES.RENDERING_ERROR}: ${message}`, context);
  }
}

/**
 * Error thrown when code execution times out.
 */
export class CodeExecutionTimeoutError extends BlogError {
  constructor(timeoutMs: number) {
    super(`${ERROR_PREFIXES.CODE_EXECUTION_TIMEOUT_ERROR}: ${timeoutMs}ms`, {
      timeoutMs,
    });
  }
}

/**
 * Error thrown when invalid code is provided for execution.
 */
export class InvalidCodeError extends BlogError {
  constructor(message: string) {
    super(`${ERROR_PREFIXES.INVALID_CODE_ERROR}: ${message}`);
  }
}

/**
 * Formats an error for logging with context.
 *
 * @param error - The error to format
 * @returns Formatted error message with context
 */
export function formatError(error: unknown): string {
  if (error instanceof BlogError) {
    const contextStr = error.context ? `\nContext: ${JSON.stringify(error.context, null, 2)}` : "";
    return `${error.message}${contextStr}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Logs an error with consistent formatting.
 *
 * @param error - The error to log
 * @param prefix - Optional prefix for the log message
 */
export function logError(error: unknown, prefix?: string): void {
  const message = formatError(error);
  const logMessage = prefix ? `${prefix} ${message}` : message;
  console.error(logMessage);
}
