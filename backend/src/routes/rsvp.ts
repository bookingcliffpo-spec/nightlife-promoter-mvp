import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { publicRsvpRateLimiter } from '../middleware/rateLimit.js';
import { sendEmail } from '../lib/resend.js';

export const rsvpRouter = Router();
rsvpRouter.use(publicRsvpRateLimiter);

rsvpRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { slug: req.params.slug },
      include: {
        venue: true,
        flyers: { take: 1, orderBy: { createdAt: 'desc' } },
        _count: { select: { guestListEntries: true } }
      }
    });
    if (!event || event.status === 'CANCELLED') throw new HttpError(404, 'Event not found');

    res.json({
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venue: event.venue,
      flyerUrl: event.flyers[0]?.url ?? null,
      capacity: event.capacity,
      rsvpCount: event._count.guestListEntries,
      soldOut: event.capacity ? event._count.guestListEntries >= event.capacity : false
    });
  })
);

const RsvpSubmissionSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  partySize: z.number().int().min(1).max(20).optional()
});

rsvpRouter.post(
  '/:slug',
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
    if (!event || event.status === 'CANCELLED') throw new HttpError(404, 'Event not found');

    const parsed = RsvpSubmissionSchema.parse(req.body);

    if (event.capacity) {
      const count = await prisma.guestListEntry.count({ where: { eventId: event.id } });
      if (count >= event.capacity) throw new HttpError(409, 'This event is sold out.');
    }

    let contactId: string | undefined;
    if (parsed.email || parsed.phone) {
      const orConditions: Array<{ email: string } | { phone: string }> = [];
      if (parsed.email) orConditions.push({ email: parsed.email });
      if (parsed.phone) orConditions.push({ phone: parsed.phone });

      const existingContact = await prisma.contact.findFirst({
        where: {
          organizationId: event.organizationId,
          OR: orConditions
        }
      });
      const [firstName, ...rest] = parsed.name.split(' ');
      const contact =
        existingContact ??
        (await prisma.contact.create({
          data: {
            organizationId: event.organizationId,
            firstName,
            lastName: rest.join(' ') || undefined,
            email: parsed.email || undefined,
            phone: parsed.phone,
            source: 'rsvp'
          }
        }));
      contactId = contact.id;
    }

    const entry = await prisma.guestListEntry.create({
      data: {
        eventId: event.id,
        contactId,
        name: parsed.name,
        email: parsed.email || undefined,
        phone: parsed.phone,
        partySize: parsed.partySize ?? 1,
        listType: 'GENERAL',
        rsvpStatus: 'CONFIRMED'
      }
    });

    if (parsed.email) {
      sendEmail({
        to: parsed.email,
        subject: `You're on the list for ${event.title}`,
        html: `<p>Hi ${parsed.name.split(' ')[0]},</p><p>Your RSVP for <strong>${event.title}</strong> is confirmed. Show this confirmation or your name at the door.</p><p>Confirmation code: <strong>${entry.qrCode}</strong></p>`
      }).catch((err) => console.error('RSVP confirmation email failed:', err));
    }

    res.status(201).json({ id: entry.id, qrCode: entry.qrCode });
  })
);
