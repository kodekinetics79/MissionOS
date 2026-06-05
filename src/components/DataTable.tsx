import { ReactNode } from 'react';
export function DataTable<T>({
  columns,
  rows,
  renderRow,
  onRowClick,
}: {
  columns: string[];
  rows: T[];
  renderRow: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={onRowClick ? 'selectable-row' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {renderRow(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
