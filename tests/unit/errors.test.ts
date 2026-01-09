/**
 * Unit tests for error utilities
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  BlogError,
  PostNotFoundError,
  ManifestLoadError,
  RenderingError,
  PostLoadError,
  CodeExecutionTimeoutError,
  InvalidCodeError,
  formatError,
  logError,
  ERROR_PREFIXES,
} from "../../src/utils/errors";

describe("formatError", () => {
  it("should format BlogError with context", () => {
    const errorMsg = "Test error";
    const context = { key: "value", number: 42 };
    const error = new BlogError(errorMsg, context);
    const expected = `${errorMsg}\nContext: ${JSON.stringify(context, null, 2)}`;
    expect(formatError(error)).toBe(expected);
  });

  it("should format BlogError without context", () => {
    const errorMsg = "Test error";
    const error = new BlogError(errorMsg);
    expect(formatError(error)).toBe(errorMsg);
  });

  it("should format PostNotFoundError with context", () => {
    const postId = "post-1";
    const context = { additional: "info" };
    const error = new PostNotFoundError(postId, context);
    const expected = `${ERROR_PREFIXES.POST_NOT_FOUND_ERROR}: ${postId}\nContext: ${JSON.stringify({ postId, ...context }, null, 2)}`;
    expect(formatError(error)).toBe(expected);
  });

  it("should format generic Error", () => {
    const errorMsg = "Generic error message";
    const error = new Error(errorMsg);
    const formatted = formatError(error);
    expect(formatted).toBe(errorMsg);
  });

  it("should format non-Error values", () => {
    for (const value of ["string error", 123, null, undefined, { message: "object" }]) {
      expect(formatError(value)).toBe(String(value));
    }
  });

  it("should format Error with empty message", () => {
    const error = new Error("");
    const formatted = formatError(error);
    expect(formatted).toBe("");
  });
});

describe("logError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should log BlogError with context", () => {
    const errorMsg = "Test error";
    const error = new BlogError(errorMsg, { key: "value" });

    logError(error);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    const callArg = consoleErrorSpy.mock.calls[0][0];
    expect(callArg).toContain(errorMsg);
    expect(callArg).toContain("Context:");
  });

  it("should log BlogError without context", () => {
    const errorMsg = "Test error";
    const error = new BlogError(errorMsg);

    logError(error);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(errorMsg);
  });

  it("should log with prefix", () => {
    const errorMsg = "Test error";
    const error = new Error(errorMsg);

    const prefix = "Prefix:";
    logError(error, prefix);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`${prefix} ${errorMsg}`);
  });

  it("should log without prefix", () => {
    const errorMsg = "Test error";
    const error = new Error(errorMsg);

    logError(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith(errorMsg);
  });

  it("should log generic Error", () => {
    const errorMsg = "Generic error";
    const error = new Error(errorMsg);

    logError(error);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Generic error");
  });

  it("should log non-Error values", () => {
    logError("string error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("string error");

    logError(123);
    expect(consoleErrorSpy).toHaveBeenCalledWith("123");
  });
});

describe("Error classes", () => {
  it("should create BlogError with message and context", () => {
    const errorMsg = "Test";
    const context = { key: "value" };
    const error = new BlogError(errorMsg, context);

    expect(error.message).toBe(errorMsg);
    expect(error.context).toEqual(context);
    expect(error.name).toBe(BlogError.name);
  });

  it("should create PostNotFoundError", () => {
    const postId = "post-1";
    const error = new PostNotFoundError(postId);

    expect(error.message).toBe(`${ERROR_PREFIXES.POST_NOT_FOUND_ERROR}: ${postId}`);
    expect(error.context?.postId).toBe(postId);
    expect(error.name).toBe(PostNotFoundError.name);
  });

  it("should create ManifestLoadError with default message", () => {
    let error = new ManifestLoadError();
    expect(error.message).toBe(ERROR_PREFIXES.MANIFEST_LOAD_ERROR);
    expect(error.name).toBe(ManifestLoadError.name);

    expect((error as BlogError).message).toBe(ERROR_PREFIXES.MANIFEST_LOAD_ERROR);
    expect((error as BlogError).name).toBe(ManifestLoadError.name);
  });

  it("should create ManifestLoadError with custom message", () => {
    const errorMsg = "Custom message";
    const context = { key: "value" };
    const error = new ManifestLoadError(errorMsg, context);

    expect(error.message).toBe(`${ERROR_PREFIXES.MANIFEST_LOAD_ERROR}: ${errorMsg}`);
    expect(error.context).toEqual(context);
    expect(error.name).toBe(ManifestLoadError.name);
  });

  it("should create RenderingError", () => {
    const errorMsg = "Render failed";
    const context = { postId: "post-1" };
    const error = new RenderingError(errorMsg, context);

    expect(error.message).toBe(`${ERROR_PREFIXES.RENDERING_ERROR}: ${errorMsg}`);
    expect(error.context).toEqual(context);
    expect(error.name).toBe(RenderingError.name);
  });

  it("should create PostLoadError", () => {
    const errorMsg = "Load failed";
    const context = { postId: "post-1" };
    const error = new PostLoadError(errorMsg, context);

    expect(error.message).toBe(`${ERROR_PREFIXES.POST_LOAD_ERROR}: ${errorMsg}`);
    expect(error.context).toEqual(context);
    expect(error.name).toBe(PostLoadError.name);
  });

  it("should create CodeExecutionTimeoutError", () => {
    const timeoutMs = 5000;
    const error = new CodeExecutionTimeoutError(timeoutMs);

    expect(error.message).toBe(`${ERROR_PREFIXES.CODE_EXECUTION_TIMEOUT_ERROR}: ${timeoutMs}ms`);
    expect(error.context?.timeoutMs).toBe(timeoutMs);
    expect(error.name).toBe(CodeExecutionTimeoutError.name);
  });

  it("should create InvalidCodeError", () => {
    const errorMsg = "Invalid syntax";
    const error = new InvalidCodeError(errorMsg);

    expect(error.message).toBe(`${ERROR_PREFIXES.INVALID_CODE_ERROR}: ${errorMsg}`);
    expect(error.name).toBe(InvalidCodeError.name);
  });
});
