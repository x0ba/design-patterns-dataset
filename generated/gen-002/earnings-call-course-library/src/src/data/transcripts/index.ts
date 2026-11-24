import type { Transcript } from '../../types';
import { hrgoQ2Transcript } from './hrgo-q2-2026';
import { hrgoQ3Transcript } from './hrgo-q3-2026';

const TRANSCRIPTS: Record<string, Transcript> = {
  'hrgo-q2-2026': hrgoQ2Transcript,
  'hrgo-q3-2026': hrgoQ3Transcript,
};

export function getTranscript(callId: string): Transcript | undefined {
  return TRANSCRIPTS[callId];
}
