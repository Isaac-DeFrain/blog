export interface BlogPost {
  id: string;
  title: string;
  date: string;
  file: string;
  topics: string[];
}

export type TopicFilterCallback = (filteredPosts: BlogPost[]) => void;

/**
 * TopicsBar handles rendering the topics bar and filtering blog posts by topic.
 */
export class TopicsBar {
  private topicsBar: HTMLElement | null;
  private allPosts: BlogPost[] = [];
  private selectedTopic: string | null = null;
  private onFilterChange: TopicFilterCallback;

  /**
   * Creates a new TopicsBar instance.
   *
   * @param topicsBarId - The ID of the topics bar element in the DOM
   * @param onFilterChange - Callback function called when the topic filter changes
   */
  constructor(topicsBarId: string, onFilterChange: TopicFilterCallback) {
    this.topicsBar = document.getElementById(topicsBarId);
    this.onFilterChange = onFilterChange;
  }

  /**
   * Sets the blog posts and re-renders the topics bar.
   *
   * @param posts - Array of all blog posts
   */
  public setPosts(posts: BlogPost[]): void {
    this.allPosts = posts;
    this.render();
  }

  /**
   * Gets the currently selected topic filter.
   *
   * @returns The selected topic string, or null if no topic is selected
   */
  public getSelectedTopic(): string | null {
    return this.selectedTopic;
  }

  /**
   * Sets the selected topic and re-renders the topics bar.
   *
   * @param topic - The topic to select, or null to clear the filter
   */
  public setSelectedTopic(topic: string | null): void {
    this.selectedTopic = topic;
    this.render();
  }

  /**
   * Renders the topics bar in the header with all available topics.
   *
   * Extracts all unique topics from all blog posts, counts how many posts reference each,
   * sorts them by count (descending), and creates clickable topic buttons.
   * Highlights the currently selected topic.
   */
  public render(): void {
    const topicsBar = this.topicsBar;
    if (!topicsBar) return;

    // Count how many posts reference each topic
    const topicCounts = new Map<string, number>();
    this.allPosts.forEach((post) => {
      post.topics.forEach((topic) => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    // Sort topics by count (descending), then alphabetically for ties
    const topicsArray = Array.from(topicCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0].localeCompare(b[0]);
      })
      .map(([topic]) => topic);

    if (topicsArray.length === 0) {
      topicsBar.innerHTML = "";
      return;
    }

    topicsBar.innerHTML = "";

    // Add "all" button to clear filter
    const allButton = document.createElement("button");
    allButton.className = "topic-button";

    if (!this.selectedTopic) {
      allButton.classList.add("active");
    }

    allButton.textContent = "all";
    allButton.addEventListener("click", () => {
      this.selectedTopic = null;
      const filteredPosts = [...this.allPosts];
      this.render();
      this.onFilterChange(filteredPosts);
    });
    topicsBar.appendChild(allButton);

    // Add topic buttons
    topicsArray.forEach((topic) => {
      const button = document.createElement("button");
      button.className = "topic-button";

      if (
        this.selectedTopic &&
        this.selectedTopic.toLowerCase() === topic.toLowerCase()
      ) {
        button.classList.add("active");
      }

      button.textContent = topic.toLowerCase();
      button.addEventListener("click", () => {
        this.selectedTopic = topic;
        const filteredPosts = this.allPosts
          .filter((post) => post.topics.some((t) => t === topic))
          .sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });

        this.render();
        this.onFilterChange(filteredPosts);
      });

      topicsBar.appendChild(button);
    });
  }
}
