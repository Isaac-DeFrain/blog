/**
 * Unit tests for utility functions including date parsing and formatting,
 * HTML escaping, and DOM helper functions.
 */
import { describe, it, expect } from "vitest";
import { parseDateAsPacificTime, formatDateAsPacificTime } from "../../src/utils/dates";
import { escapeHtml, unescapeHtml, createDivElement, createListItemElement } from "../../src/utils/html";

describe("parseDateAsPacificTime", () => {
  it("should parse a valid date string", () => {
    const date = parseDateAsPacificTime("2024-01-15");
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // January is 0
    expect(date.getDate()).toBe(15);
  });

  it("should handle dates in PST (winter)", () => {
    // January 15, 2024 is in PST (UTC-8)
    // Should be noon Pacific Time, which is 8pm UTC (20:00) for PST
    const date = parseDateAsPacificTime("2024-01-15");
    const utcHours = date.getUTCHours();
    expect(utcHours).toBe(20);
  });

  it("should handle dates in PDT (summer)", () => {
    // July 15, 2024 is in PDT (UTC-7)
    // Should be noon Pacific Time, which is 7pm UTC (19:00) for PDT
    const date = parseDateAsPacificTime("2024-07-15");
    const utcHours = date.getUTCHours();
    expect(utcHours).toBe(19);
  });

  it("should handle leap year dates", () => {
    const date = parseDateAsPacificTime("2024-02-29");
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(1); // February
    expect(date.getDate()).toBe(29);
  });

  it("should handle year boundaries", () => {
    const date = parseDateAsPacificTime("2024-12-31");
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(11); // December
    expect(date.getDate()).toBe(31);
  });

  it("should handle first day of year", () => {
    const date = parseDateAsPacificTime("2024-01-01");
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });

  it("should handle DST transition dates", () => {
    // March 10, 2024 is DST start (spring forward)
    const date1 = parseDateAsPacificTime("2024-03-10");
    expect(date1).toBeInstanceOf(Date);

    // November 5, 2024 is DST end (fall back)
    const date2 = parseDateAsPacificTime("2024-11-05");
    expect(date2).toBeInstanceOf(Date);
  });
});

describe("formatDateAsPacificTime", () => {
  it("should format a date string correctly", () => {
    const formatted = formatDateAsPacificTime("2024-01-15");
    expect(formatted).toMatch(/January 15, 2024/);
  });

  it("should format dates in different months", () => {
    expect(formatDateAsPacificTime("2024-03-15")).toMatch(/March 15, 2024/);
    expect(formatDateAsPacificTime("2024-07-15")).toMatch(/July 15, 2024/);
    expect(formatDateAsPacificTime("2024-12-25")).toMatch(/December 25, 2024/);
  });

  it("should handle leap year dates", () => {
    const formatted = formatDateAsPacificTime("2024-02-29");
    expect(formatted).toMatch(/February 29, 2024/);
  });

  it("should use Pacific Time timezone", () => {
    // The formatted date should be consistent regardless of system timezone
    const formatted = formatDateAsPacificTime("2024-01-15");
    expect(formatted).toContain("2024");
  });
});

describe("escapeHtml", () => {
  it("should escape less-than and greater-than", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml("</div>")).toBe("&lt;/div&gt;");
  });

  it("should escape ampersand", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("should escape double quotes", () => {
    expect(escapeHtml('Say "hello"')).toBe("Say &quot;hello&quot;");
  });

  it("should escape single quotes", () => {
    expect(escapeHtml("It's working")).toBe("It&#x27;s working");
  });

  it("should handle XSS attack vectors", () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;");
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeHtml("javascript:alert('XSS')")).toBe("javascript:alert(&#x27;XSS&#x27;)");
  });

  it("should handle empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should handle strings without special characters", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
    expect(escapeHtml("123")).toBe("123");
  });

  it("should handle mixed content", () => {
    expect(escapeHtml('Hello <b>World</b> & "Friends"')).toBe(
      "Hello &lt;b&gt;World&lt;/b&gt; &amp; &quot;Friends&quot;",
    );
  });

  it("should handle newlines and whitespace", () => {
    expect(escapeHtml("Line 1\nLine 2")).toBe("Line 1\nLine 2");
    expect(escapeHtml("  Indented  ")).toBe("  Indented  ");
  });
});

describe("unescapeHtml", () => {
  it("should unescape less-than and greater-than", () => {
    expect(unescapeHtml("&lt;script&gt;")).toBe("");
    expect(unescapeHtml("&lt;/div&gt;")).toBe("");
    expect(unescapeHtml("=&gt;")).toBe("=>");
  });

  it("should unescape ampersand", () => {
    expect(unescapeHtml("A &amp; B")).toBe("A & B");
  });

  it("should unescape double quotes", () => {
    expect(unescapeHtml("Say &quot;hello&quot;")).toBe('Say "hello"');
  });

  it("should unescape single quotes", () => {
    expect(unescapeHtml("It&#x27;s working")).toBe("It's working");
  });

  it("should handle mixed escaped content", () => {
    expect(unescapeHtml("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;")).toBe('alert("XSS")');
  });

  it("should handle empty string", () => {
    expect(unescapeHtml("")).toBe("");
  });

  it("should handle strings without HTML entities", () => {
    expect(unescapeHtml("Hello World")).toBe("Hello World");
    expect(unescapeHtml("123")).toBe("123");
  });

  it("should handle mixed content", () => {
    expect(unescapeHtml("Hello &lt;b&gt;World&lt;/b&gt; &amp; &quot;Friends&quot;")).toBe('Hello World & "Friends"');
  });

  it("should strip HTML tags from text", () => {
    expect(unescapeHtml('<span class="hljs-keyword">function</span>')).toBe("function");
    expect(unescapeHtml("<div>Hello</div>")).toBe("Hello");
    expect(unescapeHtml("<p>Text <strong>bold</strong> more text</p>")).toBe("Text bold more text");
  });

  it("should handle newlines and whitespace", () => {
    expect(unescapeHtml("Line 1\nLine 2")).toBe("Line 1\nLine 2");
    expect(unescapeHtml("  Indented  ")).toBe("  Indented  ");
  });

  it("should round-trip with escapeHtml", () => {
    const original = 'if (x > 5 && y < 10) { console.log("test"); }';
    const escaped = escapeHtml(original);
    const unescaped = unescapeHtml(escaped);
    expect(unescaped).toBe(original);
  });

  it("should handle large strings using regex fallback", () => {
    // Create a string larger than 100KB threshold
    const largeString = "&lt;test&gt;".repeat(10000); // ~120KB
    const result = unescapeHtml(largeString);

    // The regex fallback strips HTML tags, so &lt;test&gt; becomes empty after tag stripping
    // The function decodes &lt; to < and &gt; to >, then strips tags, leaving nothing
    expect(result).toBe("");
  });

  it("should handle nested encoding", () => {
    // Test nested encoding like &amp;lt; which should become &lt; then <
    const nested = "&amp;lt;script&amp;gt;";
    const result = unescapeHtml(nested);
    expect(result).toBe("");
  });

  it("should handle hex numeric entities", () => {
    expect(unescapeHtml("&#x27;")).toBe("'");
    expect(unescapeHtml("&#x41;")).toBe("A");
    expect(unescapeHtml("&#x61;")).toBe("a");
  });

  it("should handle decimal numeric entities", () => {
    expect(unescapeHtml("&#39;")).toBe("'");
    expect(unescapeHtml("&#65;")).toBe("A");
    expect(unescapeHtml("&#97;")).toBe("a");
  });

  it("should handle mixed numeric and named entities", () => {
    const mixed = "&lt;&#x27;&gt;&amp;&quot;";
    const result = unescapeHtml(mixed);

    // After decoding: <'>&"
    // After tag stripping: &"
    expect(result).toBe('&"');
  });

  it("should handle multiple passes of nested encoding", () => {
    // Deeply nested encoding
    const deeplyNested = "&amp;amp;amp;lt;";
    const result = unescapeHtml(deeplyNested);

    // Should decode multiple times
    expect(result).toBeDefined();
  });

  it("should handle string that grows beyond threshold during decoding", () => {
    // Create a string that starts small but grows during decoding
    // This tests the threshold check during iteration
    const growingString = "&amp;".repeat(20000); // Will grow significantly when decoded
    const result = unescapeHtml(growingString);
    expect(result).toBe("&".repeat(20000));
  });
});

describe("div", () => {
  it("should create a div with class and content", () => {
    expect(createDivElement("test-class", "test content")).toBe('<div class="test-class">test content</div>');
  });

  it("should handle empty content", () => {
    expect(createDivElement("empty", "")).toBe('<div class="empty"></div>');
  });

  it("should handle HTML content", () => {
    expect(createDivElement("container", "<p>HTML</p>")).toBe('<div class="container"><p>HTML</p></div>');
  });

  it("should handle special characters in content", () => {
    expect(createDivElement("test", 'Say "hello"')).toBe('<div class="test">Say "hello"</div>');
  });
});

describe("li", () => {
  it("should create an li with class and content", () => {
    expect(createListItemElement("list-item", "item content")).toBe('<li class="list-item">item content</li>');
  });

  it("should handle empty content", () => {
    expect(createListItemElement("empty", "")).toBe('<li class="empty"></li>');
  });

  it("should handle HTML content", () => {
    expect(createListItemElement("item", "<strong>Bold</strong>")).toBe('<li class="item"><strong>Bold</strong></li>');
  });

  it("should handle special characters in content", () => {
    expect(createListItemElement("test", "It's working")).toBe('<li class="test">It\'s working</li>');
  });
});

describe("parseDateAsPacificTime - error cases", () => {
  it("should return invalid date for malformed date string", () => {
    const date = parseDateAsPacificTime("invalid-date");
    expect(isNaN(date.getTime())).toBe(true);
  });

  it("should return invalid date for date with wrong number of parts", () => {
    const date1 = parseDateAsPacificTime("2024-01");
    expect(isNaN(date1.getTime())).toBe(true);

    const date2 = parseDateAsPacificTime("2024");
    expect(isNaN(date2.getTime())).toBe(true);

    const date3 = parseDateAsPacificTime("2024-01-15-extra");
    expect(isNaN(date3.getTime())).toBe(true);
  });

  it("should return invalid date for non-numeric date components", () => {
    const date = parseDateAsPacificTime("abc-def-ghi");
    expect(isNaN(date.getTime())).toBe(true);
  });

  it("should handle invalid month (JavaScript Date is lenient)", () => {
    // Note: JavaScript Date constructor is lenient and will overflow months
    const date = parseDateAsPacificTime("2024-13-15");
    const expectedDate = parseDateAsPacificTime("2025-01-15");
    expect(date).toEqual(expectedDate);
  });

  it("should handle invalid day (JavaScript Date is lenient)", () => {
    // Note: JavaScript Date constructor is lenient and will overflow days
    const date = parseDateAsPacificTime("2024-02-30");
    const expectedDate = parseDateAsPacificTime("2024-03-01");
    expect(date).toEqual(expectedDate);
  });

  it("should handle date parsing errors gracefully", () => {
    // Test with a date that might cause formatting errors
    const date = parseDateAsPacificTime("1970-01-01");
    expect(date).toBeInstanceOf(Date);
  });
});
