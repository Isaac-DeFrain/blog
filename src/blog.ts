import { marked } from 'marked';
import { ThemeManager } from './theme';

const EXTERNAL_POSTS_KEY = 'blog_external_posts';

interface BlogPost {
  id: string;
  title: string;
  date: string;
  file: string;
  content?: string;
}

interface Post {
  title: string;
  content: string;
  name: string;
  date: string;
}

/**
 * BlogReader handles blog loading, rendering, and sidebar navigation
 */
class BlogReader {
  private blogList: HTMLElement | null;
  private blogContent: HTMLElement | null;
  private posts: BlogPost[] = [];
  private currentPostId: string | null = null;
  private modal: HTMLElement | null;
  private modalInput: HTMLInputElement | null;

  constructor() {
    new ThemeManager('theme-toggle');

    // Initialize blog list and content
    this.blogList = document.getElementById('blog-list');
    this.blogContent = document.getElementById('blog-content');
    this.modal = document.getElementById('add-link-modal');
    this.modalInput = document.getElementById('markdown-name-input') as HTMLInputElement;
    
    // Setup add link button
    const addLinkButton = document.getElementById('add-link-button');
    if (addLinkButton) {
      addLinkButton.addEventListener('click', () => this.showModal());
    }

    // Setup modal buttons
    const modalCancel = document.getElementById('modal-cancel');
    const modalSubmit = document.getElementById('modal-submit');
    
    if (modalCancel) {
      modalCancel.addEventListener('click', () => this.hideModal());
    }
    
    if (modalSubmit) {
      modalSubmit.addEventListener('click', () => this.handleAddLink());
    }

    // Close modal on overlay click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.hideModal();
        }
      });
    }
    
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadBlogList();
    this.renderBlogList();
    
    // Load first post by default
    if (this.posts.length > 0) {
      await this.loadBlogPost(this.posts[0].id);
    }
  }

  private async loadBlogList(): Promise<void> {
    try {
      const response = await fetch('/src/blogs/index.json');
      if (!response.ok) {
        throw new Error('Failed to load blog list');
      }
      const data = await response.json() as { posts: BlogPost[] };
      
      // Load posts from localStorage
      const localBlogPosts = this.loadBlogPosts();
      
      // Merge default posts with locally stored blog posts
      const posts = [...data.posts, ...localBlogPosts];
      
      // Sort by date in reverse chronological order
      this.posts = posts.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } catch (error) {
      this.showError('Failed to load blog posts. Please try again later.');
      console.error('Error loading blog list:', error);
    }
  }

  private renderBlogList(): void {
    if (!this.blogList) return;

    if (this.posts.length === 0) {
      this.blogList.innerHTML = '<li class="loading">No posts available</li>';
      return;
    }

    this.blogList.innerHTML = '';
    
    this.posts.forEach(post => {
      const li = document.createElement('li');
      li.className = 'blog-list-item';
      if (post.id === this.currentPostId) {
        li.classList.add('active');
      }

      const h3 = document.createElement('h3');
      h3.textContent = this.escapeHtml(post.title);

      const date = document.createElement('div');
      date.className = 'date';
      date.textContent = this.formatDate(post.date);

      li.appendChild(h3);
      li.appendChild(date);

      li.addEventListener('click', () => this.loadBlogPost(post.id));

      this.blogList?.appendChild(li);
    });
  }

  private async loadBlogPost(postId: string): Promise<void> {
    if (!this.blogContent) return;

    const post = this.posts.find(p => p.id === postId);
    if (!post) {
      this.showError('Blog post not found');
      return;
    }

    this.currentPostId = postId;
    this.renderBlogList(); // Update active state

    this.blogContent.innerHTML = '<div class="loading">Loading post...</div>';

    try {
      let markdown: string;
      
      // Check if this is an external post with stored content
      if (post.content) {
        markdown = post.content;
      } else {
        const response = await fetch(`/src/blogs/${post.file}`);
        if (!response.ok) {
          throw new Error('Failed to load blog post');
        }

        markdown = await response.text();
      }
      
      const html = await marked.parse(markdown);

      this.blogContent.innerHTML = `
        <div class="blog-meta">
          ${this.escapeHtml(this.formatDate(post.date))}
            <span style="color: var(--link-color);">• External</span>
        </div>
        <div class="blog-content">
          ${html}
        </div>
      `;

      // Re-render MathJax for the new content
      if (window.MathJax) {
        window.MathJax.typesetPromise([this.blogContent]).catch((err: Error) => {
          console.error('MathJax rendering error:', err);
        });
      }

      // Scroll to top of content
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      this.showError('Failed to load blog post content. Please try again.');
      console.error('Error loading blog post:', error);
    }
  }

  private showError(message: string): void {
    if (this.blogContent) {
      this.blogContent.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private loadBlogPosts(): BlogPost[] {
    try {
      const stored = localStorage.getItem(EXTERNAL_POSTS_KEY);
      if (!stored) return [];
      
      const blogPosts: BlogPost[] = JSON.parse(stored);
      return blogPosts.map((bp, index) => ({
        id: `blog-${index}-${Date.now()}`,
        title: bp.title,
        date: bp.date,
        file: bp.file,
        content: bp.content
      }));
    } catch (error) {
      console.error('Error loading blog posts:', error);
      return [];
    }
  }

  private savePosts(posts: Post[]): void {
    try {
      localStorage.setItem(EXTERNAL_POSTS_KEY, JSON.stringify(posts));
    } catch (error) {
      console.error('Error saving posts:', error);
      alert('Failed to save post to local storage.');
    }
  }

  private showModal(): void {
    if (this.modal) {
      this.modal.classList.add('active');
      if (this.modalInput) {
        this.modalInput.value = '';
        // File inputs don't need focus
      }
    }
  }

  private hideModal(): void {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  private async handleAddLink(): Promise<void> {
    if (!this.modalInput || !this.modalInput.files || this.modalInput.files.length === 0) {
      return;
    }

    const file = this.modalInput.files[0];
    
    // Hide modal
    this.hideModal();

    // Show loading state
    if (this.blogContent) {
      this.blogContent.innerHTML = '<div class="loading">Loading markdown file...</div>';
    }

    try {
      const content = await this.readFileContent(file);
      
      // Extract title from first heading or use filename
      let title = 'External Post';
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        title = titleMatch[1];
      } else {
        title = file.name.replace(/\.md$/, '').replace(/\.markdown$/, '').replace(/-/g, ' ');
      }

      // Create new post
      const newPost: Post = {
        title,
        content,
        name: file.name,
        date: new Date().toISOString().split('T')[0],
      };

      // Load existing posts
      const stored = localStorage.getItem(EXTERNAL_POSTS_KEY);
      const posts: Post[] = stored ? JSON.parse(stored) : [];
      
      // Add new post
      posts.push(newPost);
      
      // Save to localStorage
      this.savePosts(posts);

      // Reload the blog list
      await this.loadBlogList();
      this.renderBlogList();

      // Load the newly added post
      if (this.posts.length > 0) {
        const newestPost = this.posts[0];
        await this.loadBlogPost(newestPost.id);
      }

      alert('Local markdown file added successfully!');
    } catch (error) {
      this.showError(`Failed to read markdown file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error reading local markdown:', error);
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }
}

// Extend Window interface for MathJax
declare global {
  interface Window {
    MathJax: {
      typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}

// Initialize the blog reader
new BlogReader();

