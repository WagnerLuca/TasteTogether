import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAdmin, requireParticipant } from '../middleware/auth';

export const eventsRouter = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/events — create a new tasting event
eventsRouter.post(
  '/',
  wrap(async (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: 'Event name is required' });
      return;
    }

    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
    } while ((await prisma.event.findUnique({ where: { code } })) && attempts < 10);

    const adminToken = randomUUID();
    const event = await prisma.event.create({
      data: { name: name.trim(), code, adminToken },
    });

    res.status(201).json({
      event: { id: event.id, name: event.name, code: event.code, createdAt: event.createdAt },
      adminToken,
    });
  })
);

// GET /api/events/:code — basic event metadata
eventsRouter.get(
  '/:code',
  wrap(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { code: req.params.code } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({ id: event.id, name: event.name, code: event.code, createdAt: event.createdAt });
  })
);

// GET /api/events/:code/status — live polling endpoint
eventsRouter.get(
  '/:code/status',
  wrap(async (req, res) => {
    const { adminToken, sessionToken } = req.query as { adminToken?: string; sessionToken?: string };

    const event = await prisma.event.findUnique({
      where: { code: req.params.code },
      include: {
        participants: { orderBy: { joinedAt: 'asc' } },
        tastingItems: {
          orderBy: { createdAt: 'asc' },
          include: {
            ratings: {
              include: { participant: { select: { username: true } } },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { participant: { select: { username: true } } },
        },
      },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const isAdmin = adminToken !== undefined && event.adminToken === adminToken;
    const currentParticipant = sessionToken
      ? event.participants.find((p) => p.sessionToken === sessionToken) ?? null
      : null;

    const activeItem = event.tastingItems.find((item) => item.isActive) ?? null;
    const totalParticipants = event.participants.length;
    const ratedCount = activeItem ? activeItem.ratings.length : 0;

    const items = event.tastingItems.map((item) => {
      const scores = item.ratings.map((r) => r.score);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        isActive: item.isActive,
        createdAt: item.createdAt,
        ratingsCount: item.ratings.length,
        avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        ...(isAdmin && {
          ratings: item.ratings.map((r) => ({ username: r.participant.username, score: r.score })),
        }),
      };
    });

    let hasRatedActiveItem = false;
    let myRatingForActiveItem: number | null = null;
    if (currentParticipant && activeItem) {
      const myRating = activeItem.ratings.find((r) => r.participantId === currentParticipant.id);
      hasRatedActiveItem = !!myRating;
      myRatingForActiveItem = myRating?.score ?? null;
    }

    res.json({
      event: { id: event.id, name: event.name, code: event.code, createdAt: event.createdAt },
      participants: event.participants.map((p) => ({
        id: p.id,
        username: p.username,
        joinedAt: p.joinedAt,
      })),
      participantCount: totalParticipants,
      activeItem: activeItem
        ? { id: activeItem.id, name: activeItem.name, price: activeItem.price }
        : null,
      ratingProgress: { rated: ratedCount, total: totalParticipants },
      items,
      comments: event.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        username: c.participant.username,
      })),
      hasRatedActiveItem,
      myRatingForActiveItem,
    });
  })
);

// POST /api/events/:code/join — join as a participant
eventsRouter.post(
  '/:code/join',
  wrap(async (req, res) => {
    const { username } = req.body as { username?: string };
    if (!username?.trim()) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { code: req.params.code } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const sessionToken = randomUUID();
    try {
      const participant = await prisma.participant.create({
        data: { eventId: event.id, username: username.trim(), sessionToken },
      });
      res.status(201).json({
        participant: { id: participant.id, username: participant.username, joinedAt: participant.joinedAt },
        sessionToken,
      });
    } catch {
      res.status(409).json({ error: 'Username already taken in this event' });
    }
  })
);

// POST /api/events/:code/items — add a tasting item (admin)
eventsRouter.post(
  '/:code/items',
  requireAdmin,
  wrap(async (req, res) => {
    const { name, price } = req.body as { name?: string; price?: number };
    if (!name?.trim()) {
      res.status(400).json({ error: 'Item name is required' });
      return;
    }
    if (typeof price !== 'number' || price < 0) {
      res.status(400).json({ error: 'Price must be a non-negative number' });
      return;
    }

    const item = await prisma.tastingItem.create({
      data: { eventId: req.event!.id, name: name.trim(), price },
    });
    res.status(201).json(item);
  })
);

// PATCH /api/events/:code/active-item — set (or clear) the active item (admin)
eventsRouter.patch(
  '/:code/active-item',
  requireAdmin,
  wrap(async (req, res) => {
    const { itemId } = req.body as { itemId: string | null };

    await prisma.tastingItem.updateMany({
      where: { eventId: req.event!.id },
      data: { isActive: false },
    });

    if (itemId) {
      const item = await prisma.tastingItem.findFirst({
        where: { id: itemId, eventId: req.event!.id },
      });
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      const updated = await prisma.tastingItem.update({
        where: { id: itemId },
        data: { isActive: true },
      });
      res.json(updated);
    } else {
      res.json({ message: 'Active item cleared' });
    }
  })
);

// POST /api/events/:code/items/:itemId/rate — submit or update a rating (participant)
eventsRouter.post(
  '/:code/items/:itemId/rate',
  requireParticipant,
  wrap(async (req, res) => {
    const { score } = req.body as { score?: number };
    if (typeof score !== 'number' || score < 1 || score > 5 || !Number.isInteger(score)) {
      res.status(400).json({ error: 'Score must be an integer between 1 and 5' });
      return;
    }

    const item = await prisma.tastingItem.findFirst({
      where: { id: req.params.itemId, eventId: req.event!.id },
    });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const rating = await prisma.rating.upsert({
      where: {
        participantId_tastingItemId: {
          participantId: req.participant!.id,
          tastingItemId: item.id,
        },
      },
      update: { score },
      create: { participantId: req.participant!.id, tastingItemId: item.id, score },
    });
    res.json(rating);
  })
);

// POST /api/events/:code/comments — post a comment (participant)
eventsRouter.post(
  '/:code/comments',
  requireParticipant,
  wrap(async (req, res) => {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }

    const comment = await prisma.comment.create({
      data: { eventId: req.event!.id, participantId: req.participant!.id, text: text.trim() },
      include: { participant: { select: { username: true } } },
    });
    res.status(201).json({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      username: comment.participant.username,
    });
  })
);
