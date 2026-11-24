export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  first: string;
  initials: string;
  hue: number;
  landlord?: boolean;
}

export type SectionId = 'cleaning' | 'furniture' | 'deposit' | 'utilities' | 'money';
export type TaskSection = 'cleaning' | 'utilities';
export type Decision = 'keep' | 'sell' | 'donate' | 'undecided';
export type Role = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface Task {
  id: string;
  title: string;
  room?: string;
  assignee: PersonId | null;
  due: string; // YYYY-MM-DD
  done: boolean;
  doneBy?: PersonId;
  doneAt?: number;
  updatedBy: PersonId;
  updatedAt: number;
}

export interface ConflictOption {
  label: string;
  by: PersonId;
  at: number;
  decision: Decision;
  claimedBy: PersonId | null;
}

export interface Conflict {
  summary: string;
  options: ConflictOption[];
}

export interface FurnitureItem {
  id: string;
  name: string;
  detail: string;
  decision: Decision;
  claimedBy: PersonId | null;
  updatedBy: PersonId;
  updatedAt: number;
  conflict?: Conflict;
}

export interface DepositItem {
  id: string;
  text: string;
  note?: string;
  done: boolean;
  doneBy?: PersonId;
  doneAt?: number;
  linkedTaskId?: string;
}

export interface CommentAnchor {
  section: SectionId;
  itemId?: string;
}

export interface Reply {
  id: string;
  author: PersonId;
  at: number;
  text: string;
}

export interface Thread {
  id: string;
  anchor: CommentAnchor;
  author: PersonId;
  at: number;
  text: string;
  resolved: boolean;
  replies: Reply[];
}

export type ChangeKind =
  | 'create'
  | 'done'
  | 'undone'
  | 'assign'
  | 'due'
  | 'delete'
  | 'restore'
  | 'decision'
  | 'claim'
  | 'conflict'
  | 'edit'
  | 'share';

export interface Change {
  id: string;
  at: number;
  by: PersonId;
  device: string;
  kind: ChangeKind;
  section: SectionId | 'note';
  itemId?: string;
  itemTitle?: string;
  text: string;
}

export interface Trashed {
  item: Task;
  section: TaskSection;
  index: number;
  deletedAt: number;
  deletedBy: PersonId;
}

export interface Collaborator {
  personId: PersonId;
  role: Role;
  sections: SectionId[] | 'all';
  status: 'active' | 'pending';
  invitedAt?: number;
}

export interface NoteState {
  people: Record<PersonId, Person>;
  cleaning: Task[];
  utilities: Task[];
  furniture: FurnitureItem[];
  deposit: DepositItem[];
  depositAmount: number;
  walkthrough: string;
  moneyNotes: string;
  threads: Thread[];
  changes: Change[];
  trash: Trashed[];
  collaborators: Collaborator[];
}

export interface Presence {
  personId: PersonId;
  section: SectionId;
  itemId?: string;
  doing: 'viewing' | 'editing' | 'claiming';
}
