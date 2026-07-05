import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';

export const guestlistRouter = Router();
guestlistRouter.use(requireAuth);

const GuestEntrySchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  listType: z.enum(['GENERAL', 'VIP', 'COMP', 'PROMOTER']).optional(),
  contactId: z.string().optional()
});

async function assertEventOwnership(eventId: string, organizationId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, organizationId } });
  if (!event) throw new HttpError(404, 'Event not found');
  return event;
}

guestlistRouter.get(
  '/event/:eventId',
  asyncHandler(async (req, res) => {
    await assertEventOwnership(req.params.eventId, req.auth!.organizationId);
    const entries = await prisma.guestListEntry.findMany({
      where: { eventId: req.params.eventId },
      include: { checkIns: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(entries);
  })
);

guestlistRouter.post(
  '/event/:eventId',
  asyncHandler(async (req, res) => {
    await assertEventOwnership(req.params.eventId, req.auth!.organizationId);
    const parsed = GuestEntrySchema.parse(req.body);
    const entry = await prisma.guestListEntry.create({
      data: {
        eventId: req.params.eventId,
        name: parsed.name,
        email: parsed.email || undefined,
        phone: parsed.phone,
        partySize: parsed.partySize ?? 1,
        listType: parsed.listType ?? 'GENERAL',
        contactId: parsed.contactId,
        rsvpStatus: 'CONFIRMED',
        addedBy: req.auth!.userId
      }
    });
    res.status(201).json(entry);
  })
);

guestlistRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = GuestEntrySchema.partial().parse(req.body);
    const existing = await prisma.guestListEntry.findFirst({
      where: { id: req.params.id, event: { organizationId: req.auth!.organizationId } }
    });
    if (!existing) throw new HttpError(404, 'Guest list entry not found');
    const entry = await prisma.guestListEntry.update({
      where: { id: existing.id },
      data: { ...parsed, email: parsed.email || undefined }
    });
    res.json(entry);
  })
);

guestlistRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.guestListEntry.findFirst({
      where: { id: req.params.id, event: { organizationId: req.auth!.organizationId } }
    });
    if (!existing) throw new HttpError(404, 'Guest list entry not found');
    await prisma.guestListEntry.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

guestlistRouter.get(
  '/:id/qrcode',
  asyncHandler(async (req, res) => {
    const existing = await prisma.guestListEntry.findFirst({
      where: { id: req.params.id, event: { organizationId: req.auth!.organizationId } }
    });
    if (!existing) throw new HttpError(404, 'Guest list entry not found');
    const png = await QRCode.toBuffer(existing.qrCode, { type: 'png', width: 320, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  })
);
