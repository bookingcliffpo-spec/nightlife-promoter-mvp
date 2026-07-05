import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { sendEmail } from '../lib/resend.js';
import { sendSms } from '../lib/twilio.js';
import { env } from '../env.js';

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

const CampaignInputSchema = z.object({
  name: z.string().min(1).max(160),
  channel: z.enum(['EMAIL', 'SMS']),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(10000),
  eventId: z.string().optional().nullable(),
  audienceTagIds: z.array(z.string()).optional(),
  scheduledAt: z.string().optional().nullable()
});

async function resolveAudience(organizationId: string, channel: 'EMAIL' | 'SMS', tagIds?: string[]) {
  return prisma.contact.findMany({
    where: {
      organizationId,
      unsubscribedAt: null,
      ...(channel === 'EMAIL' ? { optedInEmail: true, email: { not: null } } : { optedInSms: true, phone: { not: null } }),
      ...(tagIds && tagIds.length > 0 ? { tags: { some: { tagId: { in: tagIds } } } } : {})
    }
  });
}

campaignsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(campaigns);
  })
);

campaignsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { recipients: { include: { contact: true } } }
    });
    if (!campaign) throw new HttpError(404, 'Campaign not found');
    res.json(campaign);
  })
);

campaignsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = CampaignInputSchema.parse(req.body);
    const audience = await resolveAudience(req.auth!.organizationId, parsed.channel, parsed.audienceTagIds);

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: req.auth!.organizationId,
        name: parsed.name,
        channel: parsed.channel,
        subject: parsed.subject,
        message: parsed.message,
        eventId: parsed.eventId ?? undefined,
        audienceTagIds: parsed.audienceTagIds ?? [],
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
        status: parsed.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        recipients: { create: audience.map((contact) => ({ contactId: contact.id })) }
      },
      include: { _count: { select: { recipients: true } } }
    });

    res.status(201).json(campaign);
  })
);

campaignsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.campaign.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId }
    });
    if (!existing) throw new HttpError(404, 'Campaign not found');
    if (existing.status === 'SENDING' || existing.status === 'SENT') {
      throw new HttpError(409, 'Cannot delete a campaign that has already been sent.');
    }
    await prisma.campaign.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

campaignsRouter.post(
  '/:id/send',
  asyncHandler(async (req, res) => {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { recipients: { include: { contact: true } } }
    });
    if (!campaign) throw new HttpError(404, 'Campaign not found');
    if (campaign.status === 'SENT' || campaign.status === 'SENDING') {
      throw new HttpError(409, 'Campaign has already been sent or is currently sending.');
    }

    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'SENDING' } });

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of campaign.recipients) {
      const contact = recipient.contact;
      try {
        if (campaign.channel === 'EMAIL') {
          if (!contact.email) throw new Error('Contact has no email address');
          const unsubscribeUrl = `${env.FRONTEND_URL}/unsubscribe/${contact.id}?channel=email`;
          await sendEmail({
            to: contact.email,
            subject: campaign.subject ?? campaign.name,
            html: `${campaign.message.replace(/\n/g, '<br/>')}<p style="margin-top:24px;font-size:12px;color:#888">Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe</a></p>`
          });
        } else {
          if (!contact.phone) throw new Error('Contact has no phone number');
          await sendSms({ to: contact.phone, body: `${campaign.message}\nReply STOP to opt out.` });
        }
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'SENT', sentAt: new Date() }
        });
        sentCount += 1;
      } catch (err) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'FAILED', error: err instanceof Error ? err.message : 'Unknown error' }
        });
        failedCount += 1;
      }
    }

    const finalStatus = failedCount > 0 && sentCount === 0 ? 'FAILED' : 'SENT';
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: finalStatus, sentAt: new Date() }
    });

    res.json({ campaign: updated, sentCount, failedCount, total: campaign.recipients.length });
  })
);
