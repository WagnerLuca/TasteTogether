import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const adminToken = req.headers['x-admin-token'] as string | undefined;
  if (!adminToken) {
    res.status(401).json({ error: 'Admin token required' });
    return;
  }

  const event = await prisma.event.findFirst({
    where: { code: req.params.code, adminToken },
  });

  if (!event) {
    res.status(403).json({ error: 'Invalid admin token' });
    return;
  }

  req.event = event;
  next();
}

export async function requireParticipant(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionToken = req.headers['x-session-token'] as string | undefined;
  if (!sessionToken) {
    res.status(401).json({ error: 'Session token required' });
    return;
  }

  const participant = await prisma.participant.findFirst({
    where: { sessionToken, event: { code: req.params.code } },
    include: { event: true },
  });

  if (!participant) {
    res.status(403).json({ error: 'Invalid session token' });
    return;
  }

  req.event = participant.event;
  req.participant = participant;
  next();
}
