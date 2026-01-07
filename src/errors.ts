/**
 * @module errors
 *
 * Custom error classes for the blog application with consistent error handling.
 */

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
}

/**
 * Error thrown when a blog post is not found.
 */
export class PostNotFoundError extends BlogError {
  constructor(postId: string, context?: Record<string, unknown>) {
    super(`Blog post not found: ${postId}`, { postId, ...context });
  }
}

/**
 * Error thrown when the blog manifest fails to load.
 */
export class ManifestLoadError extends BlogError {
  constructor(message: string = "Failed to load blog manifest", context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when blog post content fails to render.
 */
export class RenderingError extends BlogError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Rendering error: ${message}`, context);
  }
}

/**
 * Error thrown when blog post content fails to load.
 */
export class PostLoadError extends BlogError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Failed to load blog post: ${message}`, context);
  }
}

/**
 * Error thrown when code execution times out.
 */
export class CodeExecutionTimeoutError extends BlogError {
  constructor(timeoutMs: number) {
    super(`Execution timeout: Code took too long to execute (${timeoutMs}ms)`, { timeoutMs });
  }
}

/**
 * Error thrown when invalid code is provided for execution.
 */
export class InvalidCodeError extends BlogError {
  constructor(message: string) {
    super(`Invalid code: ${message}`);
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
