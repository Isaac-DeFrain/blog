import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "./src/blog";

interface Manifest {
  files: string[];
}

/**
 * Validates that a date string is in YYYY-MM-DD format
 */
function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Main test function that verifies all blog posts load correctly
 */
function testBlogPosts(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all markdown files from source directory
  const srcBlogsDir = join(process.cwd(), "src", "blogs");
  const distBlogsDir = join(process.cwd(), "dist", "src", "blogs");
  const manifestPath = join(distBlogsDir, "manifest.json");

  // Check if dist directory exists (build must be run first)
  if (!existsSync(distBlogsDir)) {
    errors.push(
      `Dist directory not found: ${distBlogsDir}. Please run 'npm run build' first.`
    );

    reportResults(errors, warnings);
    process.exit(1);
  }

  // Check if manifest exists
  if (!existsSync(manifestPath)) {
    errors.push(
      `Manifest file not found: ${manifestPath}. The build may have failed.`
    );

    reportResults(errors, warnings);
    process.exit(1);
  }

  // Read manifest
  let manifest: Manifest;

  try {
    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent) as Manifest;
  } catch (error) {
    errors.push(
      `Failed to read or parse manifest.json: ${error instanceof Error ? error.message : String(error)}`
    );

    reportResults(errors, warnings);
    process.exit(1);
  }

  // Get all markdown files from source directory
  let sourceFiles: string[];

  try {
    const entries = readdirSync(srcBlogsDir, { withFileTypes: true });
    sourceFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    errors.push(
      `Failed to read source blogs directory: ${error instanceof Error ? error.message : String(error)}`
    );

    reportResults(errors, warnings);
    process.exit(1);
  }

  // Verify all source files are in manifest
  const manifestFiles = new Set(manifest.files);
  for (const sourceFile of sourceFiles) {
    if (!manifestFiles.has(sourceFile)) {
      errors.push(`Source file ${sourceFile} is not included in manifest.json`);
    }
  }

  // Verify all manifest files exist in source
  const sourceFilesSet = new Set(sourceFiles);
  for (const manifestFile of manifest.files) {
    if (!sourceFilesSet.has(manifestFile)) {
      errors.push(
        `Manifest lists ${manifestFile} but file does not exist in source directory`
      );
    }
  }

  // Verify each post can be loaded and has valid frontmatter
  for (const filename of manifest.files) {
    const distFilePath = join(distBlogsDir, filename);
    const srcFilePath = join(srcBlogsDir, filename);

    // Check if file exists in dist
    if (!existsSync(distFilePath)) {
      errors.push(`Post file not found in dist: ${filename}`);
      continue;
    }

    // Check if file exists in source
    if (!existsSync(srcFilePath)) {
      errors.push(`Post file not found in source: ${filename}`);
      continue;
    }

    // Read and parse the file
    try {
      const markdown = readFileSync(distFilePath, "utf-8");
      const frontmatter = parseFrontmatter(markdown);

      // Validate frontmatter
      if (!frontmatter.name) {
        warnings.push(`${filename}: Missing 'name' in frontmatter`);
      }

      if (!frontmatter.date) {
        warnings.push(`${filename}: Missing 'date' in frontmatter`);
      } else if (!isValidDate(frontmatter.date)) {
        errors.push(
          `${filename}: Invalid date format '${frontmatter.date}'. Expected YYYY-MM-DD format.`
        );
      }

      if (!frontmatter.topics || frontmatter.topics.length === 0) {
        warnings.push(`${filename}: No topics specified in frontmatter`);
      }

      // Verify markdown content exists (after frontmatter)
      const markdownWithoutFrontmatter = markdown.replace(
        /^---\s*\n[\s\S]*?\n---\s*\n/,
        ""
      );

      if (markdownWithoutFrontmatter.trim().length === 0) {
        warnings.push(`${filename}: No content found after frontmatter`);
      }
    } catch (error) {
      errors.push(
        `Failed to read or parse ${filename}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Report results
  reportResults(errors, warnings);

  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

/**
 * Reports test results to console
 */
function reportResults(errors: string[], warnings: string[]): void {
  console.log("\n=== Blog Posts Test Results ===\n");

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ All blog posts loaded successfully!\n");
    return;
  }

  if (errors.length > 0) {
    console.error(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
    console.error("");
  }

  if (warnings.length > 0) {
    console.warn(`⚠️  Found ${warnings.length} warning(s):\n`);
    warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
    console.warn("");
  }
}

// Run the test
testBlogPosts();
