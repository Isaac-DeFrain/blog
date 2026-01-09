/**
 * @module utils/posts
 *
 * Utility functions for filtering and sorting blog posts.
 */

import type { BlogPost } from "../blog/types";
import { parseDateAsPacificTime } from "./dates";

/**
 * Filters blog posts by topic (case-insensitive).
 *
 * @param posts - Array of blog posts to filter
 * @param topic - Topic to filter by (case-insensitive)
 * @returns Filtered array of posts that contain the topic
 */
export function filterPostsByTopic(posts: BlogPost[], topic: string): BlogPost[] {
  const normalizedTopic = topic.toLowerCase();
  return posts.filter((post) => post.topics.some((t) => t.toLowerCase() === normalizedTopic));
}

/**
 * Sorts blog posts by date in descending order (newest first).
 *
 * @param posts - Array of blog posts to sort
 * @returns Sorted array of posts (newest first)
 */
export function sortPostsByDateDescending(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    return parseDateAsPacificTime(b.date).getTime() - parseDateAsPacificTime(a.date).getTime();
  });
}

/**
 * Filters and sorts blog posts by topic.
 * If topic is null, returns all posts sorted by date.
 *
 * @param posts - Array of all blog posts
 * @param topic - Topic to filter by, or null to return all posts
 * @returns Filtered and sorted array of posts
 */
export function filterAndSortPosts(posts: BlogPost[], topic: string | null): BlogPost[] {
  if (topic === null) {
    return sortPostsByDateDescending(posts);
  }

  const filtered = filterPostsByTopic(posts, topic);
  return sortPostsByDateDescending(filtered);
}
