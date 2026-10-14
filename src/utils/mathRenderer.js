import katex from 'katex';
import { marked } from 'marked';

// Cấu hình marked chuẩn GFM và tự động xuống dòng
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Render Markdown kết hợp KaTeX cho toán học / khoa học tự nhiên.
 * SỬ DỤNG TOKEN KÝ TỰ AN TOÀN (KTXBLK / KTXINL) KHÔNG CHỨA DẤU GẠCH DƯỚI (_)
 * Để tránh việc bộ phân tích Markdown biến ___KATEX...___ thành thẻ <em><strong> làm hỏng KaTeX.
 */
export function renderMarkdownWithMath(text) {
  if (!text) return '';

  const placeholders = [];

  // 1. Khối công thức riêng: $$ ... $$
  let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const id = `KTXBLK${placeholders.length}Z`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered, isBlock: true });
    } catch {
      placeholders.push({
        id,
        html: `<div class="katex-display my-2 p-2 bg-slate-900 rounded font-mono text-cyan-300 text-xs">${formula.trim()}</div>`,
        isBlock: true,
      });
    }
    return `\n\n${id}\n\n`;
  });

  // 2. Khối công thức riêng: \[ ... \]
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    const id = `KTXBLK${placeholders.length}Z`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered, isBlock: true });
    } catch {
      placeholders.push({
        id,
        html: `<div class="katex-display my-2 p-2 bg-slate-900 rounded font-mono text-cyan-300 text-xs">${formula.trim()}</div>`,
        isBlock: true,
      });
    }
    return `\n\n${id}\n\n`;
  });

  // 3. Công thức nội dòng: $ ... $
  processed = processed.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, formula) => {
    // Tránh nhầm với mệnh giá tiền tệ như $100, $5.99
    if (/^\s*\d+([.,]\d+)?\s*$/.test(formula)) {
      return match;
    }
    const id = `KTXINL${placeholders.length}Z`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered, isBlock: false });
    } catch {
      placeholders.push({
        id,
        html: `<span class="katex-inline font-mono text-cyan-300 text-xs">${formula.trim()}</span>`,
        isBlock: false,
      });
    }
    return id;
  });

  // 4. Công thức nội dòng: \( ... \)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    const id = `KTXINL${placeholders.length}Z`;
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      placeholders.push({ id, html: rendered, isBlock: false });
    } catch {
      placeholders.push({
        id,
        html: `<span class="katex-inline font-mono text-cyan-300 text-xs">${formula.trim()}</span>`,
        isBlock: false,
      });
    }
    return id;
  });

  // 5. Render markdown
  let html = marked.parse(processed);

  // 6. Thế lại mã HTML KaTeX đã render vào các placeholder an toàn
  for (const { id, html: katexHtml, isBlock } of placeholders) {
    if (isBlock) {
      // Loại bỏ thẻ <p> bọc ngoài khối block nếu marked tự động thêm vào
      html = html.split(`<p>${id}</p>`).join(katexHtml);
    }
    html = html.split(id).join(katexHtml);
  }

  return html;
}
