import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { uniqueEventSlug } from '../utils/slug.js';

export const eventsRouter = Router();

eventsRouter.use(requireAuth);

const EventInputSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(5000).optional(),
  venueId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
  startsAt: z.string().datetime().or(z.string().min(1)),
  endsAt: z.string().datetime().or(z.string().min(1)).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  ticketUrl: z.string().url().optional().nullable(),
  coverCharge: z.number().min(0).optional(),
  expectedGuests: z.number().int().min(0).optional(),
  projectedBarRevenue: z.number().min(0).optional()
});

eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: {
        venue: true,
        flyers: true,
        _count: { select: { guestListEntries: true, checkIns: true } }
      },
      orderBy: { startsAt: 'asc' }
    });
    res.json(events);
  })
);

eventsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: {
        venue: true,
        flyers: true,
        guestListEntries: { orderBy: { createdAt: 'desc' } },
        _count: { select: { guestListEntries: true, checkIns: true } }
      }
    });
    if (!event) throw new HttpError(404, 'Event not found');
    res.json(event);
  })
);

eventsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = EventInputSchema.parse(req.body);
    const slug = await uniqueEventSlug(parsed.title);
    const event = await prisma.event.create({
      data: {
        organizationId: req.auth!.organizationId,
        title: parsed.title,
        description: parsed.description,
        venueId: parsed.venueId ?? undefined,
        status: parsed.status ?? 'DRAFT',
        slug,
        startsAt: new Date(parsed.startsAt),
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : undefined,
        capacity: parsed.capacity ?? undefined,
        ticketUrl: parsed.ticketUrl ?? undefined,
        coverCharge: parsed.coverCharge ?? 0,
        expectedGuests: parsed.expectedGuests ?? 0,
        projectedBarRevenue: parsed.projectedBarRevenue ?? 0
      }
    });
    res.status(201).json(event);
  })
);

eventsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = EventInputSchema.partial().parse(req.body);
    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Event not found');

    const event = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...parsed,
        venueId: parsed.venueId ?? undefined,
        startsAt: parsed.startsAt ? new Date(parsed.startsAt) : undefined,
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : undefined
      }
    });
    res.json(event);
  })
);

eventsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Event not found');
    await prisma.event.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const VenueInputSchema = z.object({
  name: z.string().min(1).max(160),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  timezone: z.string().optional()
});

export const venuesRouter = Router();
venuesRouter.use(requireAuth);

venuesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const venues = await prisma.venue.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { name: 'asc' }
    });
    res.json(venues);
  })
);

venuesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = VenueInputSchema.parse(req.body);
    const venue = await prisma.venue.create({
      data: { ...parsed, organizationId: req.auth!.organizationId }
    });
    res.status(201).json(venue);
  })
);

venuesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = VenueInputSchema.partial().parse(req.body);
    const existing = await prisma.venue.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Venue not found');
    const venue = await prisma.venue.update({ where: { id: existing.id }, data: parsed });
    res.json(venue);
  })
);

venuesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.venue.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Venue not found');
    await prisma.venue.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
