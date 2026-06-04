import type { CSSProperties } from 'react';

export function ReadinessScore({ score, label='Readiness' }: { score:number; label?:string }) {
  return <div className="score"><div className="score-ring" style={{'--score': `${score}%`} as CSSProperties}><span>{score}</span></div><div><strong>{label}</strong><p>{score >= 90 ? 'Operationally strong' : score >= 80 ? 'Monitor closely' : 'Action required'}</p></div></div>;
}
