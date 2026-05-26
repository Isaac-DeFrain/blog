/**
 * Unit tests for base path utilities used by GitHub Pages and custom domain deployments.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectBasePath,
  getBasePath,
  getPathSegmentsToKeep,
  getPathSegmentsToKeepFromBasePath,
  resolveBuildBasePath,
  basePathScript,
} from "../../src/utils/paths";

describe("resolveBuildBasePath", () => {
  const githubRepository = "Isaac-DeFrain/blog";
  it("should use root when CNAME is present", () => {
    expect(
      resolveBuildBasePath({
        cnameExists: true,
        githubRepository,
      }),
    ).toBe("/");
  });

  it("should use repo name for project Pages when CNAME is absent", () => {
    expect(
      resolveBuildBasePath({
        cnameExists: false,
        githubRepository,
      }),
    ).toBe("/blog/");
  });

  it("should prefer explicit override over CNAME and repository", () => {
    expect(
      resolveBuildBasePath({
        cnameExists: true,
        githubRepository,
        override: "/custom/",
      }),
    ).toBe("/custom/");
  });

  it("should default to root for local dev without CNAME or repository", () => {
    expect(resolveBuildBasePath()).toBe("/");
  });
});

describe("getPathSegmentsToKeepFromBasePath", () => {
  it("should keep zero segments for custom domain root", () => {
    expect(getPathSegmentsToKeepFromBasePath("/")).toBe(0);
  });

  it("should keep one segment for project Pages", () => {
    expect(getPathSegmentsToKeepFromBasePath("/blog/")).toBe(1);
  });
});

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

describe("basePathScript", () => {
  it("should inject fixed root base path for custom domain", () => {
    const script = basePathScript("/");

    expect(script).toContain('var b="/"');
    expect(script).toContain("window.__BASE_PATH__=b");
    expect(script).not.toContain(".github.io");
  });

  it("should inject fixed project Pages base path", () => {
    const script = basePathScript("/blog/");

    expect(script).toContain('var b="/blog/"');
    expect(script).toContain("window.__BASE_PATH__=b");
    expect(script).not.toContain(".github.io");
  });
});
