/**
 * Main entry point for the blog application
 * - `BlogReader` initializes the blog reader
 * - `MobileHeader` handles mobile auto-hide behavior
 */

import { BlogReader } from "./blog/reader";
import { MobileHeader } from "./components/mobile-header";

// Only instantiate BlogReader in browser environment
if (typeof window !== "undefined") {
  new BlogReader();
  new MobileHeader();
}
