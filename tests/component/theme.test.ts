/**
 * Tests for the ThemeManager component including theme initialization, toggling,
 * localStorage persistence, and system preference detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeManager } from "../../src/theme";
import { setupDOM, cleanupDOM } from "../helpers/dom";

describe("ThemeManager", () => {
  let themeManager: ThemeManager;
  let originalMatchMedia: typeof window.matchMedia;
  let mockMatchMedia: ReturnType<typeof vi.fn<(query: string) => MediaQueryList>>;

  beforeEach(() => {
    cleanupDOM();
    setupDOM();
    localStorage.clear();

    // Mock matchMedia
    originalMatchMedia = window.matchMedia;
    mockMatchMedia = vi.fn((query: string) => {
      if (query === "(prefers-color-scheme: dark)") {
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        } as MediaQueryList;
      }
      return originalMatchMedia(query);
    });
    window.matchMedia = mockMatchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    cleanupDOM();
  });

  describe("initialization", () => {
    it("should initialize with system preference when no saved theme", () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // Light mode
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList);

      themeManager = new ThemeManager("theme-toggle");

      expect(document.documentElement.classList.contains("dark-mode")).toBe(false);
      expect(themeManager.getCurrentTheme()).toBe("light");
    });

    it("should initialize with dark mode from system preference", () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // Dark mode
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList);

      themeManager = new ThemeManager("theme-toggle");

      expect(document.documentElement.classList.contains("dark-mode")).toBe(true);
      expect(themeManager.getCurrentTheme()).toBe("dark");
    });

    it("should initialize with saved theme from localStorage", () => {
      localStorage.setItem("theme", "dark");
      themeManager = new ThemeManager("theme-toggle");

      expect(document.documentElement.classList.contains("dark-mode")).toBe(true);
      expect(themeManager.getCurrentTheme()).toBe("dark");
    });

    it("should prioritize localStorage over system preference", () => {
      localStorage.setItem("theme", "light");
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList);

      themeManager = new ThemeManager("theme-toggle");

      expect(document.documentElement.classList.contains("dark-mode")).toBe(false);
      expect(themeManager.getCurrentTheme()).toBe("light");
    });
  });

  describe("theme toggling", () => {
    beforeEach(() => {
      themeManager = new ThemeManager("theme-toggle");
    });

    it("should toggle from light to dark", () => {
      themeManager = new ThemeManager("theme-toggle");
      // Start with light mode
      document.documentElement.classList.remove("dark-mode");

      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;
      themeButton.click();

      expect(document.documentElement.classList.contains("dark-mode")).toBe(true);
      expect(themeManager.getCurrentTheme()).toBe("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("should toggle from dark to light", () => {
      localStorage.setItem("theme", "dark");
      themeManager = new ThemeManager("theme-toggle");

      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;
      themeButton.click();

      expect(document.documentElement.classList.contains("dark-mode")).toBe(false);
      expect(themeManager.getCurrentTheme()).toBe("light");
      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("should update button icon when toggling", () => {
      themeManager = new ThemeManager("theme-toggle");
      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;

      // Start with light mode (moon icon)
      expect(themeButton.textContent).toBe("🌙");

      themeButton.click();

      // Should be dark mode (sun icon)
      expect(themeButton.textContent).toBe("☀️");
    });

    it("should update aria-label when toggling", () => {
      themeManager = new ThemeManager("theme-toggle");
      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;

      // Start with light mode
      expect(themeButton.getAttribute("aria-label")).toBe("Switch to dark mode");

      themeButton.click();

      // Should be dark mode
      expect(themeButton.getAttribute("aria-label")).toBe("Switch to light mode");
    });
  });

  describe("localStorage persistence", () => {
    it("should save theme to localStorage when toggled", () => {
      themeManager = new ThemeManager("theme-toggle");
      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;

      themeButton.click();

      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("should load theme from localStorage on initialization", () => {
      localStorage.setItem("theme", "dark");
      themeManager = new ThemeManager("theme-toggle");

      expect(themeManager.getCurrentTheme()).toBe("dark");
      expect(document.documentElement.classList.contains("dark-mode")).toBe(true);
    });

    it("should persist theme across multiple toggles", () => {
      themeManager = new ThemeManager("theme-toggle");
      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;

      themeButton.click(); // Dark
      expect(localStorage.getItem("theme")).toBe("dark");

      themeButton.click(); // Light
      expect(localStorage.getItem("theme")).toBe("light");

      themeButton.click(); // Dark
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });

  describe("system preference listener", () => {
    it("should listen for system preference changes", () => {
      const addEventListenerSpy = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      themeManager = new ThemeManager("theme-toggle");

      expect(addEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
    });

    it("should update theme when system preference changes and no saved theme", () => {
      let changeCallback: ((e: MediaQueryListEvent) => void) | null = null;
      const addEventListenerSpy = vi.fn((event: string, callback: unknown) => {
        if (event === "change" && typeof callback === "function") {
          changeCallback = callback as (e: MediaQueryListEvent) => void;
        }
      });

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      themeManager = new ThemeManager("theme-toggle");

      // Simulate system preference change to dark
      if (changeCallback !== null) {
        (changeCallback as (e: MediaQueryListEvent) => void)({
          matches: true,
          media: "(prefers-color-scheme: dark)",
        } as MediaQueryListEvent);
      }

      expect(document.documentElement.classList.contains("dark-mode")).toBe(true);
    });

    it("should not update theme when system preference changes if theme is saved", () => {
      localStorage.setItem("theme", "light");
      let changeCallback: ((e: MediaQueryListEvent) => void) | null = null;
      const addEventListenerSpy = vi.fn((event: string, callback: unknown) => {
        if (event === "change" && typeof callback === "function") {
          changeCallback = callback as (e: MediaQueryListEvent) => void;
        }
      });

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);

      themeManager = new ThemeManager("theme-toggle");

      // Simulate system preference change to dark
      if (changeCallback !== null) {
        (changeCallback as (e: MediaQueryListEvent) => void)({
          matches: true,
          media: "(prefers-color-scheme: dark)",
        } as MediaQueryListEvent);
      }

      // Should remain light because localStorage has preference
      expect(document.documentElement.classList.contains("dark-mode")).toBe(false);
    });
  });

  describe("button icon updates", () => {
    it("should show moon icon in light mode", () => {
      themeManager = new ThemeManager("theme-toggle");
      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;

      // Light mode = moon icon (to switch to dark)
      expect(themeButton.textContent).toBe("🌙");
    });

    it("should show sun icon in dark mode", () => {
      localStorage.setItem("theme", "dark");
      themeManager = new ThemeManager("theme-toggle");
      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;

      // Dark mode = sun icon (to switch to light)
      expect(themeButton.textContent).toBe("☀️");
    });

    it("should update icon when theme changes", () => {
      themeManager = new ThemeManager("theme-toggle");
      const themeButton = document.getElementById("theme-toggle") as HTMLButtonElement;

      expect(themeButton.textContent).toBe("🌙");
      themeButton.click();
      expect(themeButton.textContent).toBe("☀️");
    });
  });

  describe("getCurrentTheme", () => {
    it("should return 'light' for light mode", () => {
      themeManager = new ThemeManager("theme-toggle");
      expect(themeManager.getCurrentTheme()).toBe("light");
    });

    it("should return 'dark' for dark mode", () => {
      localStorage.setItem("theme", "dark");
      themeManager = new ThemeManager("theme-toggle");
      expect(themeManager.getCurrentTheme()).toBe("dark");
    });
  });

  describe("edge cases", () => {
    it("should handle missing theme-toggle element gracefully", () => {
      cleanupDOM();
      // Should not throw
      themeManager = new ThemeManager("non-existent");
      expect(themeManager.getCurrentTheme()).toBeDefined();
    });

    it("should handle invalid localStorage values", () => {
      localStorage.setItem("theme", "invalid");
      themeManager = new ThemeManager("theme-toggle");
      // Should fall back to system preference
      expect(themeManager.getCurrentTheme()).toBeDefined();
    });
  });
});
