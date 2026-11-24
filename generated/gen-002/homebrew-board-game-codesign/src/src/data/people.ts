import type { Person, PersonId } from '../types';

export const PEOPLE: Record<PersonId, Person> = {
  hollis: { id: 'hollis', name: 'Hollis Marchetti', short: 'Hollis', role: 'Owner', canEdit: true, color: '#1f6f78' },
  jun: { id: 'jun', name: 'Jun Park', short: 'Jun', role: 'Co-designer', canEdit: true, color: '#b8721f' },
  teodora: { id: 'teodora', name: 'Teodora Silva', short: 'Teodora', role: 'Co-designer', canEdit: true, color: '#7a4f8f' },
  sam: { id: 'sam', name: 'Sam Alvarado', short: 'Sam', role: 'Playtester', canEdit: false, color: '#476a9c' },
  aditi: { id: 'aditi', name: 'Aditi Rao', short: 'Aditi', role: 'Playtester', canEdit: false, color: '#b04f62' },
};

export const ME: PersonId = 'hollis';
