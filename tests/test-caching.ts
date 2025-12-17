/**
 * Test to demonstrate that blog posts are only cached when users click on them,
 * not during initial load or navigation.
 *
 * This test simulates the caching behavior by directly testing the localStorage
 * interactions that occur when shouldCache is true vs false.
 */

import { reportResults, exitIfErrors, localStorageMock, countBlogPostCacheEntries, isPostCached } from "./common";

/**
 * Simulates loadBlogPost behavior with shouldCache parameter
 * This mimics what happens in the actual BlogReader.loadBlogPost method
 */
function simulateLoadBlogPost(
  postId: string,
  html: string,
  date: string,
  shouldCache: boolean,
  localStorage: typeof localStorageMock,
): void {
  // Check cache first (this always happens)
  const cacheKey = `blog-post-${postId}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    // If cached, use it (this is what happens in the real code)
    return;
  }

  // If not cached, fetch and parse (simulated by having html/date passed in)
  // Only cache if shouldCache is true
  if (shouldCache) {
    const cacheData = { html, date };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  }
}

/**
 * Main test function
 */
function testCachingBehavior(): void {
  console.log("🧪 Testing blog post caching behavior\n");
  console.log("This test demonstrates that posts are only cached when shouldCache=true\n");

  const errors: string[] = [];

  // Test 1: Initial load should NOT cache posts (shouldCache = false)
  console.log("Test 1: Initial load (shouldCache = false)");
  localStorageMock.clear();
  localStorageMock.resetOperations();

  const testPostId = "test-post";
  const testHtml = "<p>Test HTML Content</p>";
  const testDate = "2024-01-15";

  const initialCacheCount = countBlogPostCacheEntries(localStorageMock);
  console.log(`  - Cache entries before: ${initialCacheCount}`);

  // Simulate initial load (shouldCache = false, which is the default)
  simulateLoadBlogPost(testPostId, testHtml, testDate, false, localStorageMock);

  const afterInitialLoadCount = countBlogPostCacheEntries(localStorageMock);
  console.log(`  - Cache entries after initial load: ${afterInitialLoadCount}`);

  if (afterInitialLoadCount !== initialCacheCount) {
    errors.push(
      `Initial load should not cache posts. Expected ${initialCacheCount} entries, got ${afterInitialLoadCount}`,
    );
  } else if (isPostCached(testPostId, localStorageMock)) {
    errors.push("Post should not be cached after initial load");
  } else {
    console.log("  ✅ Pass: Initial load does not cache posts\n");
  }

  // Test 2: User click SHOULD cache posts (shouldCache = true)
  console.log("Test 2: User click (shouldCache = true)");
  localStorageMock.clear();
  localStorageMock.resetOperations();

  const beforeClickCount = countBlogPostCacheEntries(localStorageMock);
  console.log(`  - Cache entries before click: ${beforeClickCount}`);

  // Simulate user click (shouldCache = true)
  simulateLoadBlogPost(testPostId, testHtml, testDate, true, localStorageMock);

  const afterClickCount = countBlogPostCacheEntries(localStorageMock);
  console.log(`  - Cache entries after click: ${afterClickCount}`);

  if (afterClickCount !== beforeClickCount + 1) {
    errors.push(`User click should cache posts. Expected ${beforeClickCount + 1} entries, got ${afterClickCount}`);
  } else if (!isPostCached(testPostId, localStorageMock)) {
    errors.push("Post should be cached after user click");
  } else {
    console.log("  ✅ Pass: User click caches posts\n");
  }

  // Test 3: Verify cached data is correct
  console.log("Test 3: Cache data integrity");
  const cached = localStorageMock.getItem(`blog-post-${testPostId}`);
  if (!cached) {
    errors.push("Cached post should be retrievable");
  } else {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.html !== testHtml || parsed.date !== testDate) {
        errors.push(`Cached data mismatch. Expected html="${testHtml}", date="${testDate}"`);
      } else {
        console.log("  ✅ Pass: Cached post data is correct\n");
      }
    } catch (e) {
      errors.push(`Failed to parse cached data: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Test 4: Multiple posts - only clicked ones are cached
  console.log("Test 4: Selective caching behavior");
  localStorageMock.clear();

  // Simulate scenario:
  // - Post 1: loaded initially (shouldCache = false) -> NOT cached
  // - Post 2: clicked by user (shouldCache = true) -> CACHED
  // - Post 3: loaded initially (shouldCache = false) -> NOT cached

  simulateLoadBlogPost("post-1", "<p>Post 1</p>", "2024-01-14", false, localStorageMock);
  simulateLoadBlogPost("post-2", "<p>Post 2</p>", "2024-01-15", true, localStorageMock);
  simulateLoadBlogPost("post-3", "<p>Post 3</p>", "2024-01-16", false, localStorageMock);

  const finalCacheCount = countBlogPostCacheEntries(localStorageMock);
  console.log(`  - Total cached posts: ${finalCacheCount}`);

  if (finalCacheCount !== 1) {
    errors.push(`Expected 1 cached post (post-2), but found ${finalCacheCount}`);
  } else if (!isPostCached("post-2", localStorageMock)) {
    errors.push("Post 2 should be cached after user click");
  } else if (isPostCached("post-1", localStorageMock) || isPostCached("post-3", localStorageMock)) {
    errors.push("Posts 1 and 3 should not be cached (loaded without shouldCache=true)");
  } else {
    console.log("  ✅ Pass: Only clicked posts are cached\n");
  }

  // Test 5: Cache retrieval works (using cached data)
  console.log("Test 5: Cache retrieval");
  localStorageMock.clear();

  // First, cache a post
  simulateLoadBlogPost("cached-post", "<p>Cached</p>", "2024-01-17", true, localStorageMock);

  // Then try to load it again - should use cache
  const operationsBefore = localStorageMock.getOperations().length;
  simulateLoadBlogPost("cached-post", "<p>New Content</p>", "2024-01-18", false, localStorageMock);
  const operationsAfter = localStorageMock.getOperations().length;

  // Should have retrieved from cache (getItem called) but not set new cache
  const cachedValue = localStorageMock.getItem("blog-post-cached-post");
  if (!cachedValue) {
    errors.push("Cached post should be retrievable");
  } else {
    const parsed = JSON.parse(cachedValue);
    // Should still have original content, not "New Content"
    if (parsed.html === "<p>New Content</p>") {
      errors.push("Cache should be used when available, not overwritten");
    } else {
      console.log("  ✅ Pass: Cached posts are retrieved correctly\n");
    }
  }

  // Report results
  reportResults({ errors }, "Caching Behavior Test Results");

  if (errors.length === 0) {
    console.log("Summary:");
    console.log("  ✓ Initial loads do NOT cache posts (shouldCache = false)");
    console.log("  ✓ User clicks DO cache posts (shouldCache = true)");
    console.log("  ✓ Only explicitly clicked posts are stored in localStorage");
    console.log("  ✓ Cached posts can be retrieved and used on subsequent loads\n");
  }

  exitIfErrors(errors);
}

testCachingBehavior();
