export interface EventMeta {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  resultsRevealed?: boolean;
}

export interface Participant {
  id: string;
  username: string;
  joinedAt: string;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  username: string;
}

export interface TastingItem {
  id: string;
  name: string;
  price: number;
  /** Tasting order; `items` in the status response already come sorted by it. */
  position: number;
  isActive: boolean;
  createdAt: string;
  ratingsCount: number;
  avgScore: number | null;
  comments: Comment[];
  ratings?: { username: string; score: number }[];
}

export interface EventStatus {
  event: EventMeta;
  participants: Participant[];
  participantCount: number;
  activeItem: { id: string; name: string; price: number } | null;
  ratingProgress: { rated: number; total: number };
  items: TastingItem[];
  /** null when no session token was sent; false when it's unknown (e.g. removed by the host). */
  sessionRecognized: boolean | null;
  hasRatedActiveItem: boolean;
  myRatingForActiveItem: number | null;
}
