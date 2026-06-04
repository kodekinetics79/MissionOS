import { ReactNode } from 'react';
export function DataTable<T>({ columns, rows, renderRow }: { columns:string[]; rows:T[]; renderRow:(row:T)=>ReactNode }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{renderRow(r)}</tr>)}</tbody></table></div>;
}
