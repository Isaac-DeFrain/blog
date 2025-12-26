/**
 * Main entry point for the blog application
 * Instantiates BlogReader to initialize the blog reader and
 * MobileHeaderHide to handle auto-hide behavior on mobile
 */
import { BlogReader } from "./blog";
import { MobileHeaderHide } from "./mobile-header-hide";

// Only instantiate BlogReader in browser environment
if (typeof window !== "undefined") {
  new BlogReader();
  new MobileHeaderHide();
}
