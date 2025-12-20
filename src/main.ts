/**
 * Main entry point for the blog application
 * Instantiates BlogReader to initialize the blog reader
 */
import { BlogReader } from "./blog";

// Only instantiate BlogReader in browser environment
if (typeof window !== "undefined") {
  new BlogReader();
}
