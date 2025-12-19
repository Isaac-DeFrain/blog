// Utility functions for creating HTML elements

export const div = <T>(className: T, content: T): string => {
  return `<div class="${className}">${content}</div>`;
};

export const li = <T>(className: T, content: T): string => {
  return `<li class="${className}">${content}</li>`;
};

/**
 * Parses a date string (YYYY-MM-DD) and interprets it as Pacific Time.
 *
 * Creates a Date object representing noon Pacific Time for the given date.
 * Using noon ensures that when the date is formatted in Pacific Time, it will
 * always display the correct day, regardless of timezone conversions.
 * This ensures dates are consistently interpreted in the Pacific timezone,
 * accounting for both PST (UTC-8) and PDT (UTC-7) based on daylight saving time.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @returns Date object representing noon Pacific Time for the given date
 */
export function parseDateAsPacificTime(dateString: string): Date {
  // Parse the date components
  const [year, month, day] = dateString.split("-").map(Number);

  // Create a date at noon UTC on the target date to determine DST
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Format this UTC time in Pacific Time to determine the offset
  const pacificFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });

  const pacificHour = parseInt(pacificFormatter.format(noonUtc));

  // Calculate the offset: Pacific Time is UTC-8 (PST) or UTC-7 (PDT)
  // At noon UTC, Pacific Time is typically 4am (PST) or 5am (PDT)
  // Calculate the offset: if noon UTC = 4am Pacific, then Pacific = UTC - 8
  // So noon Pacific = 8pm UTC (PST)
  // If noon UTC = 5am Pacific, then Pacific = UTC - 7
  // So noon Pacific = 7pm UTC (PDT)
  const offsetHours = pacificHour <= 4 ? -8 : -7;

  // Noon Pacific Time corresponds to 8pm UTC (PST) or 7pm UTC (PDT)
  // We create a UTC date at the time that represents noon Pacific
  // Using noon ensures the date will always be on the correct day when formatted
  const utcHourForNoonPacific = 12 - offsetHours; // 20 for PST, 19 for PDT

  return new Date(Date.UTC(year, month - 1, day, utcHourForNoonPacific, 0, 0));
}

/**
 * Formats a date string into a human-readable format.
 *
 * Converts ISO date strings (e.g. "2024-01-15") into a localized format
 * like "January 15, 2024" using US English locale. The date is interpreted
 * as Pacific Time.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @returns Formatted date string in "Month Day, Year" format
 */
export function formatDateAsPacificTime(dateString: string): string {
  const date = parseDateAsPacificTime(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
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
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
