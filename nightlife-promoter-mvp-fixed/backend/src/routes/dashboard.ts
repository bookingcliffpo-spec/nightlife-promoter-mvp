import { Router } from 'express';
import { prisma } from '../services/db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (_req, res) => {
  const [events, contacts, campaigns, integrations] = await Promise.all([
    prisma.event.count().catch(() => 0),
    prisma.contact.count().catch(() => 0),
    prisma.campaign.count().catch(() => 0),
    prisma.integration.count().catch(() => 0)
  ]);

  res.json({
    metrics: {
      upcomingEvents: events,
      contacts,
      campaigns,
      connectedIntegrations: integrations,
      projectedRevenue: 12500
    },
    insights: [
      'Best posting window: Wednesday 6 PM to 9 PM',
      'VIP/table offer should be pushed 72 hours before event',
      'Past RSVP conversion suggests stronger female-focused offer copy'
    ]
  });
});
