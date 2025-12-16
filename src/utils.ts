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
 * Creates a Date object representing midnight Pacific Time for the given date.
 * This ensures dates are consistently interpreted in the Pacific timezone,
 * accounting for both PST (UTC-8) and PDT (UTC-7) based on daylight saving time.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @returns Date object representing midnight Pacific Time for the given date
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
  // So midnight Pacific = 8am UTC (PST)
  // If noon UTC = 5am Pacific, then Pacific = UTC - 7
  // So midnight Pacific = 7am UTC (PDT)
  const offsetHours = pacificHour <= 4 ? -8 : -7;

  // Midnight Pacific Time corresponds to 8am UTC (PST) or 7am UTC (PDT)
  // We create a UTC date at the time that represents midnight Pacific
  const utcHourForMidnightPacific = -offsetHours; // 8 for PST, 7 for PDT

  return new Date(Date.UTC(year, month - 1, day, utcHourForMidnightPacific, 0, 0));
}
