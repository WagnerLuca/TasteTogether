import { Event, Participant } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      event?: Event;
      participant?: Participant & { event: Event };
    }
  }
}
