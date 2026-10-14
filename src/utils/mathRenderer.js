import katex from 'katex';
import { marked } from 'marked';

export function renderMarkdownWithMath(text) {
  if (!text) return '';

  const placeholders = [];

  // 1. Math block: $$ ... $$
  let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const id = `___KATEX_BLOCK_${placeholders.length}___`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered });
    } catch {
      placeholders.push({ id, html: match });
    }
    return `\n\n${id}\n\n`;
  });

  // 2. Math block: \[ ... \]
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    const id = `___KATEX_BLOCK_${placeholders.length}___`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered });
    } catch {
      placeholders.push({ id, html: match });
    }
    return `\n\n${id}\n\n`;
  });

  // 3. Inline math: $ ... $
  processed = processed.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, formula) => {
    // Avoid matching currency like $100
    if (/^\s*\d+([.,]\d+)?\s*$/.test(formula)) {
      return match;
    }
    const id = `___KATEX_INLINE_${placeholders.length}___`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered });
    } catch {
      placeholders.push({ id, html: match });
    }
    return id;
  });

  // 4. Inline math: \( ... \)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    const id = `___KATEX_INLINE_${placeholders.length}___`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered });
    } catch {
      placeholders.push({ id, html: match });
    }
    return id;
  });

  // 5. Render markdown
  let html = marked.parse(processed);

  // 6. Substitute placeholders back
  for (const { id, html: katexHtml } of placeholders) {
    html = html.split(id).join(katexHtml);
  }

  return html;
}
