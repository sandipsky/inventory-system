type Cell = string | number | null | undefined;

/** Downloads `rows` (the first row being the header) as a UTF-8 CSV file. */
export function downloadCsv(filename: string, rows: Cell[][]): void {
  const csv = rows.map(row => row.map(escape).join(',')).join('\r\n');
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escape(cell: Cell): string {
  const text = cell === null || cell === undefined ? '' : String(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
