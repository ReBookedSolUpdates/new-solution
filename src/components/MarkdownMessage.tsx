import React from "react";

interface MarkdownMessageProps {
  content: string;
}

/**
 * Renders markdown content from AI responses
 * Supports: bold, italics, numbered lists, bullet lists, line breaks, inline code
 */
export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  // Split content into lines to handle lists and formatting
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let currentListItems: string[] = [];
  let isNumberedList = false;

  const processLine = (line: string): React.ReactNode => {
    // Trim the line
    const trimmedLine = line.trim();

    // Skip empty lines (handled separately with spacing)
    if (!trimmedLine) return null;

    // Check for numbered list items (1. 2. 3. etc.)
    const numberedListMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (numberedListMatch) {
      const itemContent = numberedListMatch[1];
      return (
        <li key={`item-${elements.length}`} className="ml-4 text-sm leading-relaxed">
          {parseInlineFormatting(itemContent)}
        </li>
      );
    }

    // Check for bullet list items (-, *, •)
    const bulletListMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
    if (bulletListMatch) {
      const itemContent = bulletListMatch[1];
      return (
        <li key={`item-${elements.length}`} className="ml-4 text-sm leading-relaxed list-disc">
          {parseInlineFormatting(itemContent)}
        </li>
      );
    }

    // Regular paragraph
    return (
      <p key={`para-${elements.length}`} className="text-sm leading-relaxed mb-2">
        {parseInlineFormatting(trimmedLine)}
      </p>
    );
  };

  // Parse inline formatting (bold, italics, code, links)
  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let partIndex = 0;

    while (remaining.length > 0) {
      // Bold text (**text** or __text__)
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*|^__(.+?)__/);
      if (boldMatch) {
        const boldText = boldMatch[1] || boldMatch[2];
        parts.push(
          <strong key={`bold-${partIndex}`} className="font-semibold">
            {boldText}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        partIndex++;
        continue;
      }

      // Italic text (*text* or _text_)
      const italicMatch = remaining.match(/^\*(.+?)\*|^_(.+?)_/);
      if (italicMatch && !remaining.startsWith("**")) {
        const italicText = italicMatch[1] || italicMatch[2];
        parts.push(
          <em key={`italic-${partIndex}`} className="italic">
            {italicText}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        partIndex++;
        continue;
      }

      // Inline code (`text`)
      const codeMatch = remaining.match(/^`(.+?)`/);
      if (codeMatch) {
        const codeText = codeMatch[1];
        parts.push(
          <code
            key={`code-${partIndex}`}
            className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono"
          >
            {codeText}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        partIndex++;
        continue;
      }

      // Links [text](url)
      const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        parts.push(
          <a
            key={`link-${partIndex}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-book-600 hover:text-book-700 underline"
          >
            {linkText}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        partIndex++;
        continue;
      }

      // Regular text - find the next special character
      const nextSpecialIndex = Math.min(
        remaining.search(/\*\*|__|\*|_|`|\[/),
        remaining.length
      );

      if (nextSpecialIndex === -1 || nextSpecialIndex === remaining.length) {
        // No more special characters
        if (remaining.length > 0) {
          parts.push(
            <span key={`text-${partIndex}`}>{remaining}</span>
          );
        }
        break;
      } else {
        // Add text up to next special character
        if (nextSpecialIndex > 0) {
          parts.push(
            <span key={`text-${partIndex}`}>
              {remaining.substring(0, nextSpecialIndex)}
            </span>
          );
        }
        remaining = remaining.substring(nextSpecialIndex);
        partIndex++;
      }
    }

    return parts.length > 0 ? parts : [text];
  };

  // Process all lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if this is a list item
    const isListItem =
      /^\d+\.\s+/.test(trimmedLine) ||
      /^[-*•]\s+/.test(trimmedLine);

    if (isListItem) {
      // If we just finished a list, add the list wrapper
      if (currentListItems.length > 0) {
        const isBulletList = /^[-*•]\s+/.test(currentListItems[0]);
        elements.push(
          <ol
            key={`list-${elements.length}`}
            className={isBulletList ? "list-disc ml-4 mb-2" : "list-decimal ml-4 mb-2"}
          >
            {currentListItems.map((item, idx) => (
              <li key={`${idx}`} className="text-sm leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ol>
        );
        currentListItems = [];
      }

      // Extract the actual list item content
      const itemContent = trimmedLine.replace(/^\d+\.\s+|^[-*•]\s+/, "");
      currentListItems.push(itemContent);
    } else {
      // Non-list item
      if (currentListItems.length > 0) {
        // We're ending a list
        const isBulletList = /^[-*•]\s+/.test(currentListItems[0]);
        elements.push(
          <ol
            key={`list-${elements.length}`}
            className={isBulletList ? "list-disc ml-4 mb-2" : "list-decimal ml-4 mb-2"}
          >
            {currentListItems.map((item, idx) => (
              <li key={`${idx}`} className="text-sm leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ol>
        );
        currentListItems = [];
      }

      // Add the regular line
      if (trimmedLine) {
        elements.push(processLine(line));
      } else if (elements.length > 0) {
        // Add spacing for empty lines (but not at the beginning)
        elements.push(<div key={`space-${elements.length}`} className="h-1" />);
      }
    }
  }

  // Handle any remaining list items
  if (currentListItems.length > 0) {
    const isBulletList = /^[-*•]\s+/.test(currentListItems[0]);
    elements.push(
      <ol
        key={`list-${elements.length}`}
        className={isBulletList ? "list-disc ml-4 mb-2" : "list-decimal ml-4 mb-2"}
      >
        {currentListItems.map((item, idx) => (
          <li key={`${idx}`} className="text-sm leading-relaxed">
            {parseInlineFormatting(item)}
          </li>
        ))}
      </ol>
    );
  }

  return <>{elements.filter(Boolean)}</>;
};
