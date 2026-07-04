import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';

export const campaignsRouter = Router();

const CampaignSchema = z.object({
  organizationId: z.string().default('demo-org'),
  name: z.string().min(1),
  channel: z.enum(['instagram', 'facebook', 'email', 'sms', 'eventbrite', 'posh_vip']),
  message: z.string().min(1),
  scheduledAt: z.string().optional()
});

campaignsRouter.get('/', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  res.json(campaigns);
});

campaignsRouter.post('/', async (req, res) => {
  const parsed = CampaignSchema.parse(req.body);
  await prisma.organization.upsert({ where: { id: parsed.organizationId }, update: {}, create: { id: parsed.organizationId, name: 'Demo Nightlife Group' } });
  const campaign = await prisma.campaign.create({
    data: { ...parsed, scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined }
  });
  res.status(201).json(campaign);
});

campaignsRouter.post('/:id/generate-copy', async (req, res) => {
  const { eventTitle = 'Karaoke Night', offer = 'Ladies free with RSVP until 10PM', vibe = 'premium nightlife' } = req.body;
  res.json({
    captions: [
      `${eventTitle.toUpperCase()} is locked in. ${offer}. Pull up for ${vibe}, music, drinks, and nonstop energy.`,
      `This is not just another night out. ${eventTitle} brings the crowd, the music, and the moment. ${offer}.`,
      `Make your plans now. ${eventTitle}. ${offer}. Tables, tickets, and RSVP available now.`
    ]
  });
});
