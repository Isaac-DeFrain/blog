/**
 * Unit tests for base path utilities used by GitHub Pages and custom domain deployments.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectBasePath,
  getBasePath,
  getPathSegmentsToKeep,
  basePathDetectionScript,
  pathSegmentsToKeepScript,
} from "../../src/utils/paths";

describe("detectBasePath", () => {
  it("should use first path segment on github.io project Pages", () => {
    expect(detectBasePath("isaac-defrain.github.io", "/blog/zk/zk-terminology")).toBe("/blog/");
    expect(detectBasePath("isaac-defrain.github.io", "/blog/")).toBe("/blog/");
  });

  it("should use root on custom domains", () => {
    expect(detectBasePath("blog.isaacdefrain.com", "/zk/zk-terminology")).toBe("/");
    expect(detectBasePath("blog.isaacdefrain.com", "/")).toBe("/");
  });

  it("should use root on localhost", () => {
    expect(detectBasePath("localhost", "/")).toBe("/");
    expect(detectBasePath("localhost", "/zk/zk-terminology")).toBe("/");
  });

  it("should use root on github.io when pathname has no segment", () => {
    expect(detectBasePath("isaac-defrain.github.io", "/")).toBe("/");
  });
});

describe("getPathSegmentsToKeep", () => {
  it("should keep one segment on github.io", () => {
    expect(getPathSegmentsToKeep("isaac-defrain.github.io")).toBe(1);
  });

  it("should keep zero segments on custom domains", () => {
    expect(getPathSegmentsToKeep("blog.isaacdefrain.com")).toBe(0);
  });
});

describe("getBasePath", () => {
  beforeEach(() => {
    delete (window as { __BASE_PATH__?: string }).__BASE_PATH__;
  });

  afterEach(() => {
    delete (window as { __BASE_PATH__?: string }).__BASE_PATH__;
  });

  it("should prefer injected __BASE_PATH__", () => {
    window.__BASE_PATH__ = "/blog/";
    expect(getBasePath()).toBe("/blog/");
  });

  it("should detect from location when __BASE_PATH__ is unset", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "blog.isaacdefrain.com",
        pathname: "/zk/zk-terminology",
      },
    });

    expect(getBasePath()).toBe("/");
  });
});

describe("basePathDetectionScript", () => {
  it("should emit hostname-aware base path detection", () => {
    const script = basePathDetectionScript();

    expect(script).toContain("<script>");
    expect(script).toContain("window.__BASE_PATH__");
    expect(script).toContain(".github.io");
    expect(script).toContain('l.href=b+"assets/favicon.ico"');
  });
});

describe("pathSegmentsToKeepScript", () => {
  it("should emit hostname-aware path segment logic", () => {
    expect(pathSegmentsToKeepScript()).toContain('.github.io") ? 1 : 0');
  });
});
