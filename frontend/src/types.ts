export interface EventMeta {
  id: string;
  name: string;
  code: string;
  createdAt: string;
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
  hasRatedActiveItem: boolean;
  myRatingForActiveItem: number | null;
}
