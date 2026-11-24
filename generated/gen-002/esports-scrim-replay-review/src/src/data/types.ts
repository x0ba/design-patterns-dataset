export type Team = 'LOW' | 'HF';
export type Side = 'att' | 'def';
export type EndType = 'elim' | 'obj' | 'time';
export type MapId = 'foundry' | 'saltworks' | 'canopy';
export type PlayerName = 'Rook' | 'Vesper' | 'Juno' | 'Kael' | 'Mara';
export type EnemyName = 'Corvid' | 'Lumen' | 'Tess' | 'Brask' | 'Nyx';
export type AnyPlayer = PlayerName | EnemyName;
export type PovId = PlayerName | 'Spectator';

export interface Kf {
  t: number;
  x: number;
  y: number;
  look?: number; // degrees, 0 = +x, 90 = +y (toward attacker spawn)
}

export interface Track {
  player: AnyPlayer;
  team: Team;
  kfs: Kf[];
  deathT?: number;
  killer?: AnyPlayer;
}

export type EventType = 'kill' | 'ability' | 'plant' | 'defuse';

export interface GameEvent {
  id: string;
  roundId: string;
  t: number;
  type: EventType;
  actor: AnyPlayer;
  team: Team;
  victim?: AnyPlayer;
  headshot?: boolean;
  weapon?: string;
  ability?: string;
  abilityKind?: 'smoke' | 'flash' | 'trip' | 'recon' | 'stim';
  target?: [number, number];
  popT?: number;
  area: string;
}

export interface CommsLine {
  t: number;
  dur: number;
  speaker: PlayerName;
  text: string;
}

export interface Round {
  id: string;
  map: MapId;
  n: number;
  side: Side;
  won: boolean;
  end: EndType;
  objDetail?: 'detonated' | 'defused';
  extra: boolean;
  duration: number; // recording length, s
  endT: number; // when the round was decided
  plantT?: number;
  target: 'A' | 'B';
  scoreBefore: [number, number];
  scoreAfter: [number, number];
  retake: boolean;
  tracks: Track[];
  events: GameEvent[];
  comms: CommsLine[];
}

export interface Clip {
  id: string;
  roundId: string;
  tIn: number;
  tOut: number;
  pov: PovId;
  speed: number;
  title: string;
  note: string;
}

export interface Marker {
  id: string;
  roundId: string;
  t: number;
  text: string;
  createdLabel: string;
}
