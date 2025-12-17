import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "../src/blog";
import { isValidDate, Manifest, reportResults, exitIfErrors } from "./common";

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
    errors.push(`Dist directory not found: ${distBlogsDir}. Please run 'npm run build' first.`);

    reportResults({ errors, warnings }, { title: "Blog Posts Test Results" });
    exitIfErrors(errors);
    return;
  }

  // Check if manifest exists
  if (!existsSync(manifestPath)) {
    errors.push(`Manifest file not found: ${manifestPath}. The build may have failed.`);

    reportResults({ errors, warnings }, { title: "Blog Posts Test Results" });
    exitIfErrors(errors);
    return;
  }

  // Read manifest
  let manifest: Manifest;

  try {
    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent) as Manifest;
  } catch (error) {
    errors.push(`Failed to read or parse manifest.json: ${error instanceof Error ? error.message : String(error)}`);

    reportResults({ errors, warnings }, { title: "Blog Posts Test Results" });
    exitIfErrors(errors);
    return;
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
    errors.push(`Failed to read source blogs directory: ${error instanceof Error ? error.message : String(error)}`);

    reportResults({ errors, warnings }, { title: "Blog Posts Test Results" });
    exitIfErrors(errors);
    return;
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
      errors.push(`Manifest lists ${manifestFile} but file does not exist in source directory`);
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
        errors.push(`${filename}: Invalid date format '${frontmatter.date}'. Expected YYYY-MM-DD format.`);
      }

      if (!frontmatter.topics || frontmatter.topics.length === 0) {
        warnings.push(`${filename}: No topics specified in frontmatter`);
      }

      // Verify markdown content exists (after frontmatter)
      const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

      if (markdownWithoutFrontmatter.trim().length === 0) {
        warnings.push(`${filename}: No content found after frontmatter`);
      }
    } catch (error) {
      errors.push(`Failed to read or parse ${filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Report results
  reportResults(
    { errors, warnings },
    {
      title: "Blog Posts Test Results",
      successMessage: "✅ All blog posts loaded successfully!",
    },
  );

  // Exit with error code if there are errors
  exitIfErrors(errors);
}

testBlogPosts();
