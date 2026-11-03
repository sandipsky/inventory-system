// Converts a Markdown file to a Word document.
// Usage: node md2docx.js input.md output.docx [--toc]
// Supports headings, paragraphs, bold/italic/code/links, bullet and numbered lists (nested),
// tables, fenced code blocks, Mermaid diagrams (rendered to PNG with headless Chrome),
// block quotes, horizontal rules and images. With --toc, a clickable contents list of the
// level 2 and 3 headings is placed after the title.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { marked } = require('marked');
const {
  AlignmentType, Bookmark, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel, ImageRun,
  InternalHyperlink, LevelFormat, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow,
  TextRun, WidthType, VerticalAlign,
} = require('docx');
const { renderAll } = require('./mermaid-png');

const FONT = 'Arial';
const MONO = 'Consolas';
const BODY_SIZE = 21;      // half-points: 10.5pt
const CODE_SIZE = 17;      // 8.5pt
const CONTENT_DXA = 9026;  // A4 width minus 1in margins
const CONTENT_PX = 600;    // the same in CSS px, for images
const COLORS = { heading: '1F3A5F', sub: '2E5077', code: 'F3F4F6', inline: 'ECEFF1', border: 'BFC7D1', head: 'E4EBF3', quote: '7A8CA3', link: '1A5FB4' };

function unescapeHtml(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function plainText(tokens) {
  let out = '';
  for (const t of tokens || []) {
    if (t.type === 'codespan') out += unescapeHtml(t.text);
    else if (t.tokens) out += plainText(t.tokens);
    else if (t.text) out += unescapeHtml(t.text);
  }
  return out;
}

// ---------- inline ----------
function inline(tokens, style = {}) {
  const out = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case 'text':
        if (t.tokens) out.push(...inline(t.tokens, style));
        else out.push(new TextRun({ text: unescapeHtml(t.text), ...style }));
        break;
      case 'escape':
        out.push(new TextRun({ text: unescapeHtml(t.text), ...style }));
        break;
      case 'strong':
        out.push(...inline(t.tokens, { ...style, bold: true }));
        break;
      case 'em':
        out.push(...inline(t.tokens, { ...style, italics: true }));
        break;
      case 'del':
        out.push(...inline(t.tokens, { ...style, strike: true }));
        break;
      case 'codespan':
        out.push(new TextRun({
          text: unescapeHtml(t.text), font: MONO, size: style.size ? style.size - 2 : CODE_SIZE + 1,
          shading: { type: ShadingType.CLEAR, fill: COLORS.inline, color: 'auto' }, bold: style.bold,
        }));
        break;
      case 'br':
        out.push(new TextRun({ break: 1 }));
        break;
      case 'link': {
        if (/^https?:\/\//.test(t.href)) {
          const runs = inline(t.tokens, { ...style, color: COLORS.link, underline: {} });
          out.push(new ExternalHyperlink({ children: runs, link: t.href }));
        } else {
          out.push(...inline(t.tokens, { ...style, italics: true }));
        }
        break;
      }
      case 'image':
        out.push(new TextRun({ text: `[image: ${t.text || t.href}]`, italics: true, ...style }));
        break;
      case 'html':
        out.push(new TextRun({ text: unescapeHtml(t.text.replace(/<[^>]+>/g, '')), ...style }));
        break;
      default:
        if (t.tokens) out.push(...inline(t.tokens, style));
        else if (t.text) out.push(new TextRun({ text: unescapeHtml(t.text), ...style }));
    }
  }
  return out;
}

// ---------- blocks ----------
class Builder {
  constructor(mdDir, imgDir) {
    this.mdDir = mdDir;
    this.imgDir = imgDir;
    this.children = [];
    this.title = null;
    this.listInstance = 0;
    this.diagrams = []; // { id, source, index, indentLeft } placeholders resolved after rendering
    this.headings = []; // { depth, text, anchor } for the contents list
  }

  para(opts) { this.children.push(new Paragraph(opts)); }

  heading(token) {
    const runs = inline(token.tokens);
    if (token.depth === 1 && !this.title) {
      this.title = plainText(token.tokens);
      this.para({ heading: HeadingLevel.TITLE, children: runs });
      return;
    }
    const level = {
      1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6,
    }[token.depth];
    if (token.depth === 2 || token.depth === 3) {
      const anchor = `h${this.headings.length + 1}`;
      this.headings.push({ depth: token.depth, text: plainText(token.tokens), anchor });
      this.para({ heading: level, children: [bookmark(anchor, runs)] });
      return;
    }
    this.para({ heading: level, children: runs });
  }

  paragraph(token, extra = {}) {
    if (token.tokens && token.tokens.length === 1 && token.tokens[0].type === 'image') {
      this.image(token.tokens[0].href, token.tokens[0].text);
      return;
    }
    this.para({ children: inline(token.tokens), spacing: { after: 120, line: 276 }, ...extra });
  }

  image(href, alt) {
    const file = path.resolve(this.mdDir, href);
    if (!fs.existsSync(file)) {
      this.para({ children: [new TextRun({ text: `[missing image ${href}]`, italics: true })] });
      return;
    }
    const type = path.extname(file).slice(1).toLowerCase().replace('jpeg', 'jpg');
    this.pngParagraph(fs.readFileSync(file), type, null, null, alt);
  }

  pngParagraph(data, type, width, height, alt) {
    let w = width, h = height;
    if (!w || !h) {
      const dims = pngSize(data);
      w = dims ? dims.width : CONTENT_PX;
      h = dims ? dims.height : Math.round(CONTENT_PX * 0.6);
    }
    if (w > CONTENT_PX) { h = Math.round(h * CONTENT_PX / w); w = CONTENT_PX; }
    if (h > 760) { w = Math.round(w * 760 / h); h = 760; }
    this.para({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 }, keepLines: true,
      children: [new ImageRun({ type, data, transformation: { width: w, height: h }, altText: alt ? { title: alt, description: alt, name: alt } : undefined })],
    });
  }

  code(token, indentLeft = 0) {
    if ((token.lang || '').trim().toLowerCase() === 'mermaid') {
      const id = `d${this.diagrams.length + 1}`;
      const index = this.children.length;
      this.children.push(null); // placeholder
      this.diagrams.push({ id, source: token.text, index, indentLeft });
      return;
    }
    this.codeLines(token.text, indentLeft);
  }

  codeLines(text, indentLeft = 0) {
    const lines = text.replace(/\t/g, '    ').split('\n');
    const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };
    lines.forEach((line, i) => {
      this.para({
        children: [new TextRun({ text: line.length ? line : ' ', font: MONO, size: CODE_SIZE })],
        shading: { type: ShadingType.CLEAR, fill: COLORS.code, color: 'auto' },
        spacing: { before: 0, after: 0, line: 240 },
        indent: { left: indentLeft + 113, right: 113 },
        keepNext: i < lines.length - 1 && lines.length <= 40,
        keepLines: true,
        border: {
          left: border, right: border,
          top: i === 0 ? border : undefined,
          bottom: i === lines.length - 1 ? border : undefined,
        },
      });
    });
    this.para({ spacing: { before: 0, after: 80 }, children: [] });
  }

  list(token, level = 0) {
    const ordered = token.ordered;
    const instance = ordered ? ++this.listInstance : 0;
    for (const item of token.items) {
      let first = true;
      for (const sub of item.tokens) {
        if (sub.type === 'text' || sub.type === 'paragraph') {
          const runs = inline(sub.tokens);
          if (item.task) runs.unshift(new TextRun({ text: item.checked ? '☑ ' : '☐ ' }));
          this.para({
            children: runs,
            numbering: first
              ? { reference: ordered ? 'numbers' : 'bullets', level: Math.min(level, 2), instance }
              : undefined,
            indent: first ? undefined : { left: 720 * (Math.min(level, 2) + 1) },
            spacing: { after: 60, line: 264 },
          });
          first = false;
        } else if (sub.type === 'list') {
          this.list(sub, level + 1);
        } else if (sub.type === 'code') {
          this.code(sub, 720 * (Math.min(level, 2) + 1));
        } else if (sub.type === 'space') {
          // ignore
        } else if (sub.type === 'table') {
          this.table(sub);
        } else if (sub.type === 'blockquote') {
          this.blockquote(sub);
        } else if (sub.tokens) {
          this.para({ children: inline(sub.tokens), indent: { left: 720 * (level + 1) } });
        }
      }
    }
  }

  table(token) {
    const cols = token.header.length;
    const weights = token.header.map((h, c) => {
      let max = Math.min(plainText(h.tokens).length, 40);
      for (const row of token.rows) max = Math.max(max, Math.min(plainText(row[c]?.tokens || []).length, 40));
      return max + 6;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map(w => Math.round(CONTENT_DXA * w / total));
    widths[widths.length - 1] += CONTENT_DXA - widths.reduce((a, b) => a + b, 0);
    const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };
    const borders = { top: border, bottom: border, left: border, right: border };
    const margins = { top: 60, bottom: 60, left: 100, right: 100 };
    const align = c => ({ center: AlignmentType.CENTER, right: AlignmentType.RIGHT }[token.align[c]] || AlignmentType.LEFT);

    const cell = (tok, c, isHead) => new TableCell({
      width: { size: widths[c], type: WidthType.DXA },
      borders, margins, verticalAlign: VerticalAlign.TOP,
      shading: isHead ? { type: ShadingType.CLEAR, fill: COLORS.head, color: 'auto' } : undefined,
      children: [new Paragraph({
        alignment: align(c), spacing: { before: 0, after: 0, line: 252 },
        children: inline(tok ? tok.tokens : [], isHead ? { bold: true, size: BODY_SIZE - 1 } : { size: BODY_SIZE - 1 }),
      })],
    });

    const rows = [
      new TableRow({ tableHeader: true, cantSplit: true, children: token.header.map((h, c) => cell(h, c, true)) }),
      ...token.rows.map(r => new TableRow({ cantSplit: true, children: Array.from({ length: cols }, (_, c) => cell(r[c], c, false)) })),
    ];
    this.children.push(new Table({ rows, width: { size: CONTENT_DXA, type: WidthType.DXA }, columnWidths: widths }));
    this.para({ spacing: { before: 0, after: 120 }, children: [] });
  }

  blockquote(token) {
    const border = { style: BorderStyle.SINGLE, size: 18, color: COLORS.quote, space: 8 };
    for (const sub of token.tokens) {
      if (sub.type === 'paragraph' || sub.type === 'text') {
        this.para({
          children: inline(sub.tokens, { color: '3D4A5C' }),
          indent: { left: 360, right: 360 }, border: { left: border },
          spacing: { before: 60, after: 120, line: 276 },
          shading: { type: ShadingType.CLEAR, fill: 'F7F9FC', color: 'auto' },
        });
      } else if (sub.type === 'list') this.list(sub, 1);
      else if (sub.type === 'code') this.code(sub, 360);
    }
  }

  hr() {
    this.para({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border, space: 1 } }, spacing: { before: 120, after: 200 }, children: [] });
  }

  block(token) {
    switch (token.type) {
      case 'heading': return this.heading(token);
      case 'paragraph': return this.paragraph(token);
      case 'code': return this.code(token);
      case 'list': return this.list(token);
      case 'table': return this.table(token);
      case 'blockquote': return this.blockquote(token);
      case 'hr': return this.hr();
      case 'space': return;
      case 'html': {
        const text = unescapeHtml(token.text.replace(/<[^>]+>/g, '')).trim();
        if (text) this.para({ children: [new TextRun(text)] });
        return;
      }
      case 'text': return this.para({ children: inline(token.tokens || [{ type: 'text', text: token.text }]) });
      default:
        if (token.text) this.para({ children: [new TextRun(unescapeHtml(token.text))] });
    }
  }

  async resolveDiagrams(log) {
    if (!this.diagrams.length) return;
    const results = await renderAll(this.diagrams.map(d => ({ id: d.id, source: d.source })), this.imgDir);
    // Replace from the last placeholder backwards so earlier indexes stay valid
    for (const d of [...this.diagrams].reverse()) {
      const r = results.find(x => x.id === d.id);
      const collect = new Builder(this.mdDir, this.imgDir);
      if (r && !r.error) {
        collect.pngParagraph(fs.readFileSync(r.file), 'png', r.width, r.height, 'diagram');
      } else {
        log(`  ! diagram ${d.id} failed: ${r ? r.error : 'not rendered'}; kept as text`);
        collect.codeLines(d.source, d.indentLeft);
      }
      this.children.splice(d.index, 1, ...collect.children);
    }
  }

  contents() {
    if (!this.headings.length) return [];
    const out = [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Contents')] })];
    for (const h of this.headings) {
      out.push(new Paragraph({
        spacing: { before: 0, after: h.depth === 2 ? 40 : 20, line: 252 },
        indent: { left: h.depth === 3 ? 540 : 0 },
        children: [new InternalHyperlink({
          anchor: h.anchor,
          children: [new TextRun({ text: h.text, color: h.depth === 2 ? COLORS.heading : '3D4A5C', size: h.depth === 2 ? BODY_SIZE : BODY_SIZE - 2, bold: h.depth === 2 })],
        })],
      }));
    }
    out.push(new Paragraph({ children: [], spacing: { after: 240 } }));
    return out;
  }
}

// docx gives every Bookmark the numeric id 1 (each instance has its own counter); Word wants them unique
let bookmarkCounter = 0;
function bookmark(anchor, children) {
  const b = new Bookmark({ id: anchor, children });
  const n = ++bookmarkCounter;
  for (const part of [b.start, b.end]) {
    const attrs = part.root && part.root[0];
    if (attrs && attrs.root) attrs.root.id = n;
  }
  return b;
}

function pngSize(buf) {
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return null;
}

function headingStyle(size, color, before, after, outlineLevel) {
  return {
    run: { font: FONT, size, bold: true, color },
    paragraph: { spacing: { before, after }, keepNext: true, keepLines: true, outlineLevel },
  };
}

async function convert(input, output, { toc = false, log = console.log } = {}) {
  const md = fs.readFileSync(input, 'utf8');
  const tokens = marked.lexer(md, { gfm: true });
  const imgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2docx-'));
  const b = new Builder(path.dirname(path.resolve(input)), imgDir);
  for (const t of tokens) b.block(t);
  await b.resolveDiagrams(log);
  fs.rmSync(imgDir, { recursive: true, force: true });

  const title = b.title || path.basename(input, '.md');
  const children = b.children.filter(Boolean);
  if (toc) {
    // The contents list goes after the title paragraph and the intro note that follows it
    const at = children.findIndex((c, i) => i > 0 && c instanceof Paragraph && !(c.options && c.options.heading === HeadingLevel.TITLE));
    children.splice(Math.max(1, Math.min(at + 1, 3)), 0, ...b.contents());
  }

  const doc = new Document({
    creator: 'Inventory System docs',
    title,
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY_SIZE }, paragraph: { spacing: { after: 120, line: 276 } } },
        title: { run: { font: FONT, size: 44, bold: true, color: COLORS.heading }, paragraph: { spacing: { before: 0, after: 240 }, keepNext: true } },
        heading1: headingStyle(32, COLORS.heading, 400, 120, 0),
        heading2: headingStyle(26, COLORS.sub, 300, 100, 1),
        heading3: headingStyle(23, '333333', 220, 80, 2),
        heading4: headingStyle(21, '333333', 180, 60, 3),
        heading5: headingStyle(21, '555555', 160, 60, 4),
        heading6: headingStyle(21, '555555', 160, 60, 5),
      },
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [0, 1, 2].map(l => ({
            level: l, format: LevelFormat.BULLET, text: ['•', '◦', '▪'][l], alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } },
          })),
        },
        {
          reference: 'numbers',
          levels: [0, 1, 2].map(l => ({
            level: l, format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][l],
            text: `%${l + 1}.`, alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Inventory System · ${title}`, size: 16, color: '8A94A6' })] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16, color: '8A94A6' })] })] }),
      },
      children,
    }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, buf);
  return { title, diagrams: b.diagrams.length };
}

module.exports = { convert };

if (require.main === module) {
  const args = process.argv.slice(2);
  const toc = args.includes('--toc');
  const files = args.filter(a => !a.startsWith('--'));
  if (files.length < 2) { console.error('Usage: node md2docx.js input.md output.docx [--toc]'); process.exit(1); }
  convert(files[0], files[1], { toc }).then(r => console.log(`${files[1]} (${r.title}, ${r.diagrams} diagrams)`))
    .catch(e => { console.error(e); process.exit(1); });
}
