/**
 * @module utils/async
 *
 * Async utility functions for promises and timeouts.
 */

/**
 * Creates a Promise executor function that resolves after a specified timeout.
 *
 * This is a curried function that returns a Promise executor compatible with
 * the Promise constructor. It's useful for creating delays in async code,
 * particularly in tests where you need to wait for asynchronous operations
 * to complete.
 *
 * @param timeout - The delay in milliseconds before resolving
 * @returns A Promise executor function that resolves after the timeout
 */
export const resolveWithTimeout = (timeout: number) => {
  return (resolve: (value: unknown) => void): void => {
    setTimeout(resolve, timeout);
  };
};
