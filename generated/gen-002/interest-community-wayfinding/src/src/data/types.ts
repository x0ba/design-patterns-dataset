export interface Community {
  id: string;
  name: string;
  members: number;
  joinedAt: number;
  description: string;
  pinnedGuideId?: string;
}

export interface Space {
  id: string;
  communityId: string;
  parentId: string | null;
  name: string;
  description: string;
  threadCount: number;
}

export interface Reply {
  id: string;
  author: string;
  text: string;
  helpful: number;
  at: number;
}

export interface Thread {
  id: string;
  communityId: string;
  spaceId: string;
  title: string;
  author: string;
  createdAt: number;
  lastActivityAt: number;
  body: string;
  replyCount: number;
  replies: Reply[];
  guide?: { guideId: string; section: number };
}

export interface GuideSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Guide {
  id: string;
  communityId: string;
  title: string;
  byline: string;
  updatedAt: number;
  intro: string;
  sections: GuideSection[];
}

export interface Meetup {
  when: number;
  place: string;
  detail: string;
  bring?: string;
}

export interface RegionalGroup {
  id: string;
  communityId: string;
  name: string;
  city: string;
  state: string;
  milesFromPittsburgh: number;
  members: number;
  about: string;
  organizers: string[];
  meetup?: Meetup;
}
