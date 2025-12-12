/**
 * ThemeManager handles theme toggling and persistence across the application
 */
export class ThemeManager {
  private themeButton: HTMLButtonElement | null;
  private isDarkMode: boolean = false;

  constructor(themeButtonId: string = 'theme-toggle') {
    this.themeButton = document.getElementById(themeButtonId) as HTMLButtonElement;
    this.init();
  }

  private init(): void {
    this.loadTheme();
    
    if (this.themeButton) {
      this.themeButton.addEventListener('click', () => this.toggleTheme());
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches);
      }
    });
  }

  /**
   * Load theme from localStorage or system preference
   */
  private loadTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    this.setTheme(this.isDarkMode);
  }

  /**
   * Toggle between light and dark themes
   */
  private toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.setTheme(this.isDarkMode);
  }

  /**
   * Set the theme and update UI
   */
  private setTheme(isDark: boolean): void {
    this.isDarkMode = isDark;
    
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    this.updateThemeButton();
  }

  /**
   * Update the theme button icon
   */
  private updateThemeButton(): void {
    if (this.themeButton) {
      this.themeButton.textContent = this.isDarkMode ? '☀️' : '🌙';
      this.themeButton.setAttribute('aria-label', 
        this.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  /**
   * Get current theme state
   */
  public getCurrentTheme(): 'dark' | 'light' {
    return this.isDarkMode ? 'dark' : 'light';
  }
}

