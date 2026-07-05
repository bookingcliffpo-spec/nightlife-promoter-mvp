import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { publicRsvpRateLimiter } from '../middleware/rateLimit.js';

export const unsubscribeRouter = Router();
unsubscribeRouter.use(publicRsvpRateLimiter);

const QuerySchema = z.object({ channel: z.enum(['email', 'sms', 'all']).default('all') });

unsubscribeRouter.post(
  '/:contactId',
  asyncHandler(async (req, res) => {
    const { channel } = QuerySchema.parse(req.query);
    const contact = await prisma.contact.findUnique({ where: { id: req.params.contactId } });
    if (!contact) throw new HttpError(404, 'Contact not found');

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        optedInEmail: channel === 'email' || channel === 'all' ? false : contact.optedInEmail,
        optedInSms: channel === 'sms' || channel === 'all' ? false : contact.optedInSms,
        unsubscribedAt: new Date()
      }
    });

    res.json({ success: true });
  })
);
