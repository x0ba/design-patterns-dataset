import type { Settings } from '../types';
import { greetingClaimsOwner, quoteFor } from './engine';
import { fmtMoney } from './time';
import type { Page } from './route';

export type FixStatus = 'done' | 'partial' | 'todo';

export interface Fix {
  id: string;
  title: string;
  status: FixStatus;
  detail: string;
  page: Page;
  target: string;
}

const TARGET_CITY_COUNT = 7;

/** Rafa's list for tonight, checked against the saved (live) settings. */
export function tonightFixes(s: Settings): Fix[] {
  const car = s.services.find((x) => x.id === 'car-lockout');
  const carAfter = car ? quoteFor(s, car, '2026-11-17T23:00:00-07:00') : null;
  const aj = s.cities.find((c) => c.name === 'Apache Junction');
  const ajOff = aj ? !aj.on : true;
  const onCount = s.cities.filter((c) => c.on).length;
  const safe = s.services.find((x) => x.id === 'safe-open');
  const claims = greetingClaimsOwner(s.greeting);

  return [
    {
      id: 'car-after-hours',
      title: 'Car lockouts after hours quote $125',
      status: car?.useAfterHours ? 'done' : 'todo',
      detail: car?.useAfterHours
        ? 'After-hours rate is on for car lockouts.'
        : carAfter && carAfter.kind === 'amount'
          ? `After-hours rate is off. Callers get ${fmtMoney(carAfter.amount)} at night.`
          : 'After-hours rate is off.',
      page: 'services',
      target: 'Prices & services',
    },
    {
      id: 'service-area',
      title: 'Apache Junction removed, 7 cities',
      status: ajOff && onCount === TARGET_CITY_COUNT ? 'done' : ajOff ? 'partial' : 'todo',
      detail: ajOff
        ? `Apache Junction is off. ${onCount} cities are on, and the target is ${TARGET_CITY_COUNT}.`
        : `Still ${onCount} cities, and Apache Junction is on.`,
      page: 'business',
      target: 'Business',
    },
    {
      id: 'safe-message',
      title: 'Safe openings take a message',
      status: safe?.booking === 'message' ? 'done' : 'todo',
      detail: safe?.booking === 'message' ? 'Safe openings are taken as messages.' : 'Safe openings are still booked.',
      page: 'services',
      target: 'Prices & services',
    },
    {
      id: 'disclose',
      title: 'Says it is an assistant, not you',
      status: s.disclosureOn && !claims ? 'done' : s.disclosureOn ? 'partial' : 'todo',
      detail: !s.disclosureOn
        ? 'Disclosure is off. The greeting says "this is Rafa."'
        : claims
          ? 'Disclosure is on, but the greeting still says "this is Rafa."'
          : 'Disclosure is on at the start of every call.',
      page: 'assistant',
      target: 'Assistant',
    },
    {
      id: 'child-pet-text',
      title: 'Child or pet in a vehicle texts you now',
      status: s.alertIntent ? 'done' : 'todo',
      detail: s.alertIntent
        ? 'Any child or pet locked in a vehicle triggers a text.'
        : `Only ${s.alertPhrases.length} exact phrases trigger a text. "My son's locked in the van" does not.`,
      page: 'assistant',
      target: 'Assistant',
    },
    {
      id: 'tone',
      title: 'Less formal tone',
      status: s.formality >= 2 ? 'done' : 'todo',
      detail: s.formality >= 2 ? 'Tone is set below Formal.' : 'Tone is still Formal or stricter.',
      page: 'assistant',
      target: 'Assistant',
    },
  ];
}

export function fixStatusTone(status: FixStatus): 'ok' | 'warn' | 'neutral' {
  return status === 'done' ? 'ok' : status === 'partial' ? 'warn' : 'neutral';
}
