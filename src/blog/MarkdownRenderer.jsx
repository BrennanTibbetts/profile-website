const INLINE_PATTERN =
  /(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;

function isBlockStart(line) {
  const trimmed = line.trimStart();
  return (
    /^#{1,6}\s+/.test(trimmed) ||
    /^```/.test(trimmed) ||
    /^[-*]\s+/.test(trimmed) ||
    /^\d+\.\s+/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)
  );
}

function renderInline(text, keyPrefix) {
  const nodes = [];
  let lastIndex = 0;
  let index = 0;
  let match;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      const label = match[2];
      const href = match[3]?.trim() ?? "";
      const isUnsafe = /^javascript:/i.test(href);

      if (isUnsafe || !href) {
        nodes.push(label);
      } else {
        const external = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={`${keyPrefix}-link-${index}`}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            {label}
          </a>
        );
      }
    } else if (match[4]) {
      nodes.push(<code key={`${keyPrefix}-code-${index}`}>{match[5]}</code>);
    } else if (match[6]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${index}`}>{match[7]}</strong>);
    } else if (match[8]) {
      nodes.push(<em key={`${keyPrefix}-em-${index}`}>{match[9]}</em>);
    }

    lastIndex = INLINE_PATTERN.lastIndex;
    index += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  INLINE_PATTERN.lastIndex = 0;
  return nodes;
}

export default function MarkdownRenderer({ markdown }) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks = [];

  let i = 0;
  while (i < lines.length) {
    const currentLine = lines[i];
    const trimmedLine = currentLine.trim();

    if (!trimmedLine) {
      i += 1;
      continue;
    }

    const headingMatch = currentLine.match(/^\s*(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = `h${Math.min(level, 6)}`;
      blocks.push(<Tag key={`heading-${i}`}>{renderInline(headingMatch[2].trim(), `heading-${i}`)}</Tag>);
      i += 1;
      continue;
    }

    if (/^```/.test(trimmedLine)) {
      const language = trimmedLine.replace(/^```/, "").trim();
      const codeLines = [];
      i += 1;

      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }

      if (i < lines.length) {
        i += 1;
      }

      blocks.push(
        <pre key={`code-${i}`} className="blog-code-block">
          <code className={language ? `language-${language}` : undefined}>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmedLine)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i += 1;
      }

      blocks.push(
        <ul key={`ul-${i}`}>
          {items.map((item, itemIndex) => (
            <li key={`ul-${i}-${itemIndex}`}>{renderInline(item, `ul-${i}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmedLine)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i += 1;
      }

      blocks.push(
        <ol key={`ol-${i}`}>
          {items.map((item, itemIndex) => (
            <li key={`ol-${i}-${itemIndex}`}>{renderInline(item, `ol-${i}-${itemIndex}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^>\s?/.test(trimmedLine)) {
      const quoteLines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }

      blocks.push(
        <blockquote key={`quote-${i}`}>
          <p>{renderInline(quoteLines.join(" "), `quote-${i}`)}</p>
        </blockquote>
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine)) {
      blocks.push(<hr key={`hr-${i}`} />);
      i += 1;
      continue;
    }

    const paragraphLines = [trimmedLine];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }

    blocks.push(<p key={`p-${i}`}>{renderInline(paragraphLines.join(" "), `p-${i}`)}</p>);
  }

  return <div className="blog-markdown">{blocks}</div>;
}
