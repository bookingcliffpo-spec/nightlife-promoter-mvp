import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';

export const eventsRouter = Router();

const EventSchema = z.object({
  organizationId: z.string().default('demo-org'),
  title: z.string().min(1),
  venue: z.string().min(1),
  address: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  capacity: z.number().optional(),
  ticketUrl: z.string().optional(),
  flyerUrl: z.string().optional(),
  expectedGuests: z.number().optional(),
  projectedBar: z.number().optional()
});

eventsRouter.get('/', async (_req, res) => {
  const data = await prisma.event.findMany({ orderBy: { startsAt: 'asc' } }).catch(() => []);
  res.json(data);
});

eventsRouter.post('/', async (req, res) => {
  const parsed = EventSchema.parse(req.body);
  await prisma.organization.upsert({ where: { id: parsed.organizationId }, update: {}, create: { id: parsed.organizationId, name: 'Demo Nightlife Group' } });
  const event = await prisma.event.create({
    data: { ...parsed, startsAt: new Date(parsed.startsAt), endsAt: parsed.endsAt ? new Date(parsed.endsAt) : undefined }
  });
  res.status(201).json(event);
});
