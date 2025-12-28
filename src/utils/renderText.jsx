import React from 'react';

/**
 * Convert a single paragraph string into an array of React nodes,
 * replacing occurrences of ==highlight== with a styled inline element.
 *
 * @param {string} text
 * @param {string|number} keyBase
 * @returns {Array<React.Node>}
 */
export function renderInlineText(text = '', keyBase = 0) {
  const parts = [];
  // Match either ==text==, =y=text=y= (yellow/skill), or =p=text=p= (purple/framework)
  const regex = /(==([^=]+)==)|=y=([^=]+)=y=|=p=([^=]+)=p=/g;
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    let inner = null;
    let cls = 'inline-attr';

    if (match[2]) {
      // ==text==
      inner = match[2];
      cls = 'inline-attr';
    } else if (match[3]) {
      // =y=text=y=
      inner = match[3];
      cls = 'inline-skill';
    } else if (match[4]) {
      // =p=text=p=
      inner = match[4];
      cls = 'inline-framework';
    }

    parts.push(
      <span key={`attr-${keyBase}-${idx}`} className={cls}>
        {inner}
      </span>
    );

    lastIndex = regex.lastIndex;
    idx += 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Split a text into paragraphs and return an array of <p> elements
 * with inline highlights processed.
 */
export function renderParagraphsAsNodes(text = '', paraClass = '', keyBase = 0) {
  const paragraphs = (text || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return paragraphs.map((p, i) => (
    <p key={`p-${keyBase}-${i}`} className={paraClass}>
      {renderInlineText(p, `${keyBase}-${i}`)}
    </p>
  ));
}

export default renderInlineText;
