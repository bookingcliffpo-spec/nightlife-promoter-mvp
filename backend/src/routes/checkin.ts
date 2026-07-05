import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';

export const checkinRouter = Router();
checkinRouter.use(requireAuth);

const ScanSchema = z.object({
  code: z.string().min(1),
  method: z.enum(['QR', 'MANUAL']).optional()
});

checkinRouter.post(
  '/scan',
  asyncHandler(async (req, res) => {
    const { code, method } = ScanSchema.parse(req.body);

    const entry = await prisma.guestListEntry.findFirst({
      where: { qrCode: code, event: { organizationId: req.auth!.organizationId } },
      include: { event: true }
    });
    if (!entry) throw new HttpError(404, 'No guest found for this code');

    if (entry.checkedInAt) {
      return res.status(409).json({
        error: 'Guest already checked in',
        entry,
        checkedInAt: entry.checkedInAt
      });
    }

    const [updatedEntry, checkIn] = await prisma.$transaction([
      prisma.guestListEntry.update({ where: { id: entry.id }, data: { checkedInAt: new Date() } }),
      prisma.checkIn.create({
        data: {
          eventId: entry.eventId,
          guestListEntryId: entry.id,
          method: method ?? 'QR',
          scannedBy: req.auth!.userId
        }
      })
    ]);

    res.json({ entry: updatedEntry, checkIn });
  })
);

checkinRouter.get(
  '/event/:eventId',
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId, organizationId: req.auth!.organizationId }
    });
    if (!event) throw new HttpError(404, 'Event not found');

    const [checkIns, totalGuests, checkedIn] = await Promise.all([
      prisma.checkIn.findMany({
        where: { eventId: event.id },
        include: { guestListEntry: true },
        orderBy: { scannedAt: 'desc' }
      }),
      prisma.guestListEntry.aggregate({ where: { eventId: event.id }, _sum: { partySize: true }, _count: true }),
      prisma.guestListEntry.count({ where: { eventId: event.id, checkedInAt: { not: null } } })
    ]);

    res.json({
      checkIns,
      totalGuestListEntries: totalGuests._count,
      totalExpectedGuests: totalGuests._sum.partySize ?? 0,
      checkedIn
    });
  })
);
