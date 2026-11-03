// Converts every Markdown file under docs/ to a Word file next to it.
// Usage: node build-docx.js [file.md ...]   (no arguments = every .md under docs/, except this folder)
// Needs Node 20+ and Google Chrome (google-chrome-stable, or set CHROME_BIN) for the Mermaid diagrams.
'use strict';
const fs = require('fs');
const path = require('path');
const { convert } = require('./md2docx');

const DOCS = path.resolve(__dirname, '..');
const SKIP = new Set(['tools', 'node_modules']);

function findMarkdown(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) findMarkdown(path.join(dir, entry.name), out);
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out.sort();
}

async function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args.map(f => path.resolve(f)) : findMarkdown(DOCS);
  let failed = 0;
  for (const md of files) {
    const docx = md.replace(/\.md$/i, '.docx');
    const rel = path.relative(DOCS, md);
    try {
      // The index has no sections worth a contents list; every other document gets one.
      const toc = path.basename(md).toLowerCase() !== 'readme.md';
      const result = await convert(md, docx, { toc, log: console.log });
      console.log(`${rel} -> ${path.basename(docx)}  (${result.diagrams} diagram${result.diagrams === 1 ? '' : 's'})`);
    } catch (error) {
      failed++;
      console.error(`${rel}: FAILED: ${error.message}`);
    }
  }
  console.log(`${files.length - failed} of ${files.length} documents converted.`);
  process.exit(failed ? 1 : 0);
}

main();
