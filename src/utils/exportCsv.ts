type Row = Record<string, unknown>;

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function exportCsv(filename: string, rows: Row[]) {
  if (typeof document === 'undefined' || !rows.length) return;
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => escapeCsv(row[key])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
