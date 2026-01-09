/**
 * @module blog/post-loader
 *
 * Handles loading blog posts from the server, including manifest fetching
 * and frontmatter parsing.
 */

import type { BlogPost, BlogManifest } from "./types";
import { ManifestLoadError, PostLoadError } from "../utils/errors";
import { parseFrontmatter } from "../utils/frontmatter";
import { parseDateAsPacificTime } from "../utils/dates";
import { REGEX_PATTERNS } from "./constants";

/**
 * Loads and parses blog posts from the server.
 */
export class PostLoader {
  /**
   * Loads the blog post list by discovering all markdown files and parsing their frontmatter.
   *
   * Fetches the manifest.json to get a list of all markdown files, then loads each file
   * to extract metadata (name, date, topics) from frontmatter. Sorts posts by date in
   * reverse chronological order (newest first).
   *
   * @param basePath - The base path for the application
   * @returns Promise that resolves with sorted array of blog posts
   * @throws ManifestLoadError if manifest fails to load
   */
  async loadBlogList(basePath: string): Promise<BlogPost[]> {
    try {
      // Fetch manifest to get list of markdown files
      const manifestResponse = await fetch(`${basePath}posts/manifest.json`);

      if (!manifestResponse.ok) {
        throw new ManifestLoadError();
      }

      // Load and parse each markdown file
      const manifest = (await manifestResponse.json()) as BlogManifest;
      const posts = await Promise.all(
        manifest.files.map(async (filename) => {
          try {
            return await this.loadPostMetadata(basePath, filename);
          } catch (error) {
            console.warn(`Failed to load ${filename}:`, error);
            return null;
          }
        }),
      );

      // Filter out null entries and sort by date in reverse chronological order
      const validPosts = posts
        .filter((post): post is BlogPost => post !== null)
        .sort((a, b) => {
          return parseDateAsPacificTime(b.date).getTime() - parseDateAsPacificTime(a.date).getTime();
        });

      return validPosts;
    } catch (error) {
      if (error instanceof ManifestLoadError) {
        throw error;
      }

      throw new ManifestLoadError("Failed to load blog posts", { originalError: error });
    }
  }

  /**
   * Loads metadata for a single blog post from its markdown file.
   *
   * @param basePath - The base path for the application
   * @param filename - The markdown filename
   * @returns Promise that resolves with blog post metadata
   * @throws PostLoadError if post fails to load
   */
  async loadPostMetadata(basePath: string, filename: string): Promise<BlogPost> {
    try {
      const markdownResponse = await fetch(`${basePath}posts/${filename}`);
      if (!markdownResponse.ok) {
        throw new PostLoadError(`Failed to load ${filename}`, { filename, status: markdownResponse.status });
      }

      const markdown = await markdownResponse.text();
      const frontmatter = parseFrontmatter(markdown);

      // Generate id from filename (remove .md extension)
      const id = filename.replace(REGEX_PATTERNS.MARKDOWN_EXTENSION, "");

      return {
        id,
        name: frontmatter.name || "Untitled",
        date: frontmatter.date || "1970-01-01",
        file: filename,
        topics: frontmatter.topics || [],
      };
    } catch (error) {
      if (error instanceof PostLoadError) {
        throw error;
      }

      throw new PostLoadError(`Error loading ${filename}`, { filename, originalError: error });
    }
  }

  /**
   * Loads the full markdown content of a blog post.
   *
   * @param basePath - The base path for the application
   * @param filename - The markdown filename
   * @returns Promise that resolves with the markdown content
   * @throws PostLoadError if post fails to load
   */
  async loadPostContent(basePath: string, filename: string): Promise<string> {
    try {
      const response = await fetch(`${basePath}posts/${filename}`);
      if (!response.ok) {
        throw new PostLoadError("Failed to load blog post", { filename, status: response.status });
      }

      return await response.text();
    } catch (error) {
      if (error instanceof PostLoadError) {
        throw error;
      }

      throw new PostLoadError("Failed to load blog post content", { filename, originalError: error });
    }
  }
}
