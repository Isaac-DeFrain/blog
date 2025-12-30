/**
 * @module mobile-header-hide
 *
 * Handles auto-hiding the header and topics bar on mobile devices
 * when the user scrolls past the sidebar and becomes idle.
 */

/**
 * MobileHeaderHide manages the auto-hide behavior for header and topics bar on mobile.
 * Hides the header and topics bar when:
 * - User is on mobile viewport (max-width: 768px)
 * - User has scrolled past the sidebar
 * - User is only scrolling (no other mouse movement or touch events for a period)
 * Shows the header when:
 * - User scrolls back to the sidebar
 * - User has scrolled up 50 times consecutively (when hidden)
 */
export class MobileHeaderHide {
  private header: HTMLElement | null;
  private topicsContainer: HTMLElement | null;
  private mobileMediaQuery: MediaQueryList;
  private isHidden: boolean = false;
  private idleTimeout: number | null = null;
  private lastScrollY: number = 0;
  private scrollUpCount: number = 0;

  private readonly IDLE_DELAY_MS = 2000; // 2 seconds of inactivity
  private readonly MOBILE_BREAKPOINT = 768;
  private readonly SCROLL_THRESHOLD = 100; // Number of scroll ups required to show header

  private boundHandlers: {
    scroll?: () => void;
    mousemove?: () => void;
    touchstart?: () => void;
  } = {};

  constructor() {
    this.header = document.querySelector(".header");
    this.topicsContainer = document.querySelector(".topics-container");
    this.mobileMediaQuery = window.matchMedia(`(max-width: ${this.MOBILE_BREAKPOINT}px)`);

    // Only set up if we're on mobile
    if (this.mobileMediaQuery.matches) {
      this.setup();
    }

    // Listen for viewport changes
    this.mobileMediaQuery.addEventListener("change", (e) => {
      if (e.matches) {
        this.setup();
      } else {
        this.teardown();
        this.show();
      }
    });
  }

  /**
   * Sets up scroll and mouse event listeners for auto-hide functionality.
   */
  private setup(): void {
    if (!this.header || !this.topicsContainer) return;

    // Initialize scroll position
    this.lastScrollY = window.scrollY;

    // Bind handlers and store references for cleanup
    this.boundHandlers.scroll = this.handleScroll.bind(this);
    this.boundHandlers.mousemove = this.handleMouseMove.bind(this);
    this.boundHandlers.touchstart = this.handleTouchStart.bind(this);

    window.addEventListener("scroll", this.boundHandlers.scroll, { passive: true });
    window.addEventListener("mousemove", this.boundHandlers.mousemove, { passive: true });
    window.addEventListener("touchstart", this.boundHandlers.touchstart, { passive: true });

    // Initial check
    this.handleScroll();
  }

  /**
   * Removes event listeners and resets state.
   */
  private teardown(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    if (this.boundHandlers.scroll) {
      window.removeEventListener("scroll", this.boundHandlers.scroll);
    }
    if (this.boundHandlers.mousemove) {
      window.removeEventListener("mousemove", this.boundHandlers.mousemove);
    }
    if (this.boundHandlers.touchstart) {
      window.removeEventListener("touchstart", this.boundHandlers.touchstart);
    }

    this.boundHandlers = {};
    this.scrollUpCount = 0;
    this.lastScrollY = 0;
    this.show();
  }

  /**
   * Handles scroll events to check if user has scrolled past sidebar.
   * Tracks scroll direction and shows header after 50 scroll ups when hidden.
   */
  private handleScroll(): void {
    if (!this.mobileMediaQuery.matches) return;

    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    const currentScrollY = window.scrollY;

    // Check if sidebar is out of view (scrolled past)
    const scrolledPastSidebar = sidebarRect.bottom < 0;

    // Determine scroll direction
    const scrollingUp = currentScrollY < this.lastScrollY;
    const scrollingDown = currentScrollY > this.lastScrollY;

    if (scrolledPastSidebar) {
      if (this.isHidden) {
        // Header is hidden - track scroll ups
        if (scrollingUp) {
          this.scrollUpCount++;

          // Show header after reaching threshold
          if (this.scrollUpCount >= this.SCROLL_THRESHOLD) {
            this.show();
            this.scrollUpCount = 0;
            this.scheduleHide();
          }
        } else if (scrollingDown) {
          // Reset counter on scroll down
          this.scrollUpCount = 0;
        }
      } else {
        // Header is visible - schedule hide
        this.scheduleHide();
      }
    } else {
      // Scrolled back to sidebar - show header and reset counter
      this.show();
      this.scrollUpCount = 0;
    }

    this.lastScrollY = currentScrollY;
  }

  /**
   * Handles mouse movement to reset idle timer.
   * Shows header immediately and reschedules hide if scrolled past sidebar.
   */
  private handleMouseMove(): void {
    if (!this.mobileMediaQuery.matches) return;

    // Show immediately on non-scrolling mouse movement
    this.show();

    // Only schedule hide if scrolled past sidebar
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      const sidebarRect = sidebar.getBoundingClientRect();
      if (sidebarRect.bottom < 0) {
        this.scheduleHide();
      }
    }
  }

  /**
   * Handles touch events to reset idle timer.
   * Does not show header on touch - only reschedules hide if scrolled past sidebar.
   */
  private handleTouchStart(): void {
    if (!this.mobileMediaQuery.matches) return;

    // Reset scroll up counter on touch (user is interacting)
    this.scrollUpCount = 0;

    // Only schedule hide if scrolled past sidebar and header is visible
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      const sidebarRect = sidebar.getBoundingClientRect();
      if (sidebarRect.bottom < 0 && !this.isHidden) {
        this.scheduleHide();
      }
    }
  }

  /**
   * Schedules hiding the header and topics bar after idle delay.
   */
  private scheduleHide(): void {
    // Always show immediately when user is active
    this.show();

    // Clear existing timeout
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    // Schedule hide after idle period
    this.idleTimeout = window.setTimeout(() => {
      const sidebar = document.querySelector(".sidebar");
      if (!sidebar) return;

      const sidebarRect = sidebar.getBoundingClientRect();
      const scrolledPastSidebar = sidebarRect.bottom < 0;

      if (scrolledPastSidebar && this.mobileMediaQuery.matches) {
        this.hide();
      }
    }, this.IDLE_DELAY_MS);
  }

  /**
   * Hides the header and topics bar with smooth transition.
   */
  private hide(): void {
    if (this.isHidden || !this.header || !this.topicsContainer) return;

    this.header.classList.add("header-hidden");
    this.topicsContainer.classList.add("topics-hidden");
    this.isHidden = true;
  }

  /**
   * Shows the header and topics bar with smooth transition.
   */
  private show(): void {
    if (!this.isHidden || !this.header || !this.topicsContainer) return;

    this.header.classList.remove("header-hidden");
    this.topicsContainer.classList.remove("topics-hidden");
    this.isHidden = false;
    this.scrollUpCount = 0; // Reset counter when showing
  }
}
