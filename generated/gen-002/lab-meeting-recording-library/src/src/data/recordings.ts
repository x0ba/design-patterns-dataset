import type { ActionItem, Recording } from './types'
import { oct15 } from './oct15'
import { oct22 } from './oct22'
import { oct24 } from './oct24'
import { oct29 } from './oct29'
import { nov5 } from './nov5'
import { nov7 } from './nov7'
import { mmss } from './build'

// Newest first, as the library lists them.
export const RECORDINGS: Recording[] = [nov7, nov5, oct29, oct24, oct22, oct15]
export const recById = (id: string): Recording => RECORDINGS.find((r) => r.id === id) ?? RECORDINGS[0]

// Where Dr. Okonkwo is right now: Oct 15, 23:40, saved speed 1.5x.
export const INITIAL_HEARD: Record<string, [number, number][]> = { oct15: [[0, mmss('23:40')]] }
export const INITIAL_POS: Record<string, number> = { oct15: mmss('23:40') }
export const SAVED_RATE = 1.5

// "Today" in the story: Monday Nov 16, 2026. The presentation is Thursday Nov 19.
export const TODAY = '2026-11-16'
export const PRESENT_DATE = '2026-11-19'

export const ACTIONS: ActionItem[] = [
  { id: 'a1', owner: 'me', text: 'Present the cruise data plan (15 minutes, one page)', due: '2026-11-19', done: false, rec: 'nov5', at: mmss('43:00') },
  { id: 'a2', owner: 'me', text: 'Send your CRediT contribution statement for the kelp manuscript to Prof. Halvorsen', due: '2026-11-20', done: false, rec: 'oct29', at: mmss('57:20') },
  { id: 'a3', owner: 'jun', text: 'Hold two priority cytometer blocks the week of Nov 23 for the cruise samples', due: '2026-11-20', done: false, rec: 'nov5', at: mmss('54:10') },
  { id: 'a4', owner: 'diego', text: 'Circulate the manuscript draft with revised Figure 3 and the provisional author list', due: '2026-11-13', done: false, rec: 'nov5', at: mmss('39:30') },
  { id: 'a5', owner: 'priya', text: 'Check every station ID against the paper log before cruise files go to the NAS', due: '2026-11-23', done: false, rec: 'nov5', at: mmss('51:30') },
  { id: 'a6', owner: 'jun', text: 'Publish the cytometer calendar and one-page rules sheet', due: '2026-10-23', done: true, rec: 'oct22', at: mmss('15:30') },
  { id: 'a7', owner: 'halv', text: 'Email the CRediT template and the Nov 20 deadline to all co-authors', due: '2026-10-30', done: true, rec: 'oct29', at: mmss('58:40') },
  { id: 'a8', owner: 'maren', text: 'Re-run gating on batch 2 of the kelp-associated bacteria', due: '2026-11-12', done: true, rec: 'oct29', at: mmss('25:30') },
  { id: 'a9', owner: 'lena', text: 'Finish the −80 inventory and defrost the lower freezer before the dry shipper arrives', due: '2026-11-12', done: true, rec: 'oct15', at: mmss('54:00') },
]
