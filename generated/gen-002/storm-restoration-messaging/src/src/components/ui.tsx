import type { ReactNode } from 'react';
import type { OutageStatus, Role } from '../types';

export const STATUS_LABEL: Record<OutageStatus, string> = {
  reported: 'Reported',
  assigned: 'Crew assigned',
  'en-route': 'En route',
  working: 'Working',
  restored: 'Restored',
};

export const ROLE_LABEL: Record<Role, string> = {
  crew: 'Crew',
  mutual: 'Mutual aid',
  dispatch: 'Dispatch',
  callcenter: 'Call center',
  ops: 'Operations',
  storm: 'Storm desk',
  system: 'System',
};

export function Pill({ tone, children, title }: { tone: string; children: ReactNode; title?: string }) {
  return (
    <span className={`pill pill-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function statusTone(s: OutageStatus): string {
  switch (s) {
    case 'reported':
      return 'red';
    case 'assigned':
      return 'blue';
    case 'en-route':
      return 'teal';
    case 'working':
      return 'amber';
    case 'restored':
      return 'green';
  }
}

/** Age tone for a waiting item: amber after 10 minutes, red after 20. */
export function ageTone(minutes: number): 'ok' | 'warn' | 'bad' {
  if (minutes >= 20) return 'bad';
  if (minutes >= 10) return 'warn';
  return 'ok';
}

export function roleClass(role: Role): string {
  return `role-${role}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
