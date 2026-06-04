import { ReactNode } from 'react';
export function SectionCard({ title, children, action, id }: { title:string; children:ReactNode; action?:ReactNode; id?:string }) {
  return <section id={id} className="section-card"><div className="section-head"><h2>{title}</h2>{action}</div>{children}</section>;
}
