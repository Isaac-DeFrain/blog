import { li } from "./utils";

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  file: string;
  topics: string[];
}

export type PostClickCallback = (postId: string) => Promise<void>;

/**
 * Sidebar handles rendering the blog post list in the sidebar navigation.
 */
export class Sidebar {
  private blogList: HTMLElement | null;
  private posts: BlogPost[] = [];
  private currentPostId: string | null = null;
  private onPostClick: PostClickCallback;

  /**
   * Creates a new Sidebar instance.
   *
   * @param blogListId - The ID of the blog list element in the DOM
   * @param onPostClick - Callback function called when a post is clicked
   */
  constructor(
    blogListId: string,
    onPostClick: PostClickCallback,
  ) {
    this.blogList = document.getElementById(blogListId);
    this.onPostClick = onPostClick;
  }

  /**
   * Sets the blog posts and re-renders the sidebar.
   *
   * @param posts - Array of blog posts to display
   */
  public setPosts(posts: BlogPost[]): void {
    this.posts = posts;
    this.render();
  }

  /**
   * Sets the currently active post ID and re-renders the sidebar.
   *
   * @param postId - The ID of the active post, or null if no post is active
   */
  public setActivePost(postId: string | null): void {
    this.currentPostId = postId;
    this.render();
  }

  /**
   * Renders the blog post list in the sidebar navigation.
   *
   * Creates list items for each blog post with title, formatted date, and click handlers.
   * Marks the currently active post with the 'active' class for visual feedback.
   *
   * If no posts are available, displays a "No posts available" message.
   * Escapes HTML in titles to prevent XSS attacks.
   */
  public render(): void {
    if (!this.blogList) return;

    if (this.posts.length === 0) {
      this.blogList.innerHTML = li("loading", "No posts available");
      return;
    }

    this.blogList.innerHTML = "";

    this.posts.forEach((post) => {
      const li = document.createElement("li");
      li.className = "blog-list-item";

      if (post.id === this.currentPostId) {
        li.classList.add("active");
      }

      const h3 = document.createElement("h3");
      h3.textContent = this.escapeHtml(post.title);

      const date = document.createElement("div");
      date.className = "date";
      date.textContent = this.formatDate(post.date);

      li.appendChild(h3);
      li.appendChild(date);

      // Handle post click
      li.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
          await this.onPostClick(post.id);
        } catch (error) {
          console.error("Error loading blog post:", error);
        }
      });

      this.blogList?.appendChild(li);
    });
  }

  /**
   * Formats a date string into a human-readable format.
   *
   * Converts ISO date strings (e.g., "2024-01-15") into a localized format
   * like "January 15, 2024" using US English locale.
   *
   * @param dateString - ISO format date string (YYYY-MM-DD)
   * @returns Formatted date string in "Month Day, Year" format
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /**
   * Escapes HTML special characters in text to prevent XSS attacks.
   *
   * Uses the browser's built-in DOM API to safely escape characters like
   * <, >, &, ", and ' by setting textContent and reading back innerHTML.
   *
   * @param text - The raw text string that may contain HTML characters
   * @returns HTML-escaped string safe for insertion into the DOM
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
