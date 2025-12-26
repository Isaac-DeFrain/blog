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
 */
export class MobileHeaderHide {
  private header: HTMLElement | null;
  private topicsContainer: HTMLElement | null;
  private mobileMediaQuery: MediaQueryList;
  private isHidden: boolean = false;
  private idleTimeout: number | null = null;

  private readonly IDLE_DELAY_MS = 2000; // 2 seconds of inactivity
  private readonly MOBILE_BREAKPOINT = 768;

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
    window.console.log("setup");
    if (!this.header || !this.topicsContainer) return;

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
    this.show();
  }

  /**
   * Handles scroll events to check if user has scrolled past sidebar.
   * Only shows header if scrolled back to sidebar, but doesn't show on scroll when hidden.
   */
  private handleScroll(): void {
    window.console.log("handleScroll");
    if (!this.mobileMediaQuery.matches) return;

    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const sidebarRect = sidebar.getBoundingClientRect();

    // Check if sidebar is out of view (scrolled past)
    const scrolledPastSidebar = sidebarRect.bottom < 0;

    if (scrolledPastSidebar) {
      // If header is already hidden, don't show it on scroll
      // Only mouse movement will reveal it
      if (!this.isHidden) {
        this.scheduleHide();
      }
      // If already hidden, do nothing - let it stay hidden
    } else {
      // Scrolled back to sidebar - show header
      this.show();
    }
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
   * Shows header immediately and reschedules hide if scrolled past sidebar.
   */
  private handleTouchStart(): void {
    if (!this.mobileMediaQuery.matches) return;

    // Show immediately on any touch
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
    window.console.log("hide");
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
  }
}
