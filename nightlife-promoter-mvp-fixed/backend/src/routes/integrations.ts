import { Router } from 'express';
import { prisma } from '../services/db.js';

export const integrationsRouter = Router();

integrationsRouter.get('/', async (_req, res) => {
  const integrations = await prisma.integration.findMany().catch(() => []);
  res.json(integrations);
});

integrationsRouter.get('/meta/connect', (_req, res) => {
  const url = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.META_APP_ID || ''}&redirect_uri=${encodeURIComponent(process.env.META_REDIRECT_URI || '')}&scope=pages_show_list,pages_read_engagement,instagram_basic`;
  res.json({ connectUrl: url, note: 'Requires Meta app review for production publishing permissions.' });
});

integrationsRouter.get('/eventbrite/connect', (_req, res) => {
  const url = `https://www.eventbrite.com/oauth/authorize?response_type=code&client_id=${process.env.EVENTBRITE_CLIENT_ID || ''}&redirect_uri=${encodeURIComponent(process.env.EVENTBRITE_REDIRECT_URI || '')}`;
  res.json({ connectUrl: url });
});

integrationsRouter.post('/posh/import', async (req, res) => {
  const { events = [] } = req.body;
  res.json({ imported: events.length, note: 'Use official Posh.vip API/webhooks if available, otherwise CSV import/export.' });
});

integrationsRouter.post('/manual-connect', async (req, res) => {
  const { organizationId = 'demo-org', provider, accountName } = req.body;
  await prisma.organization.upsert({ where: { id: organizationId }, update: {}, create: { id: organizationId, name: 'Demo Nightlife Group' } });
  const integration = await prisma.integration.create({ data: { organizationId, provider, accountName, connectedAt: new Date() } });
  res.status(201).json(integration);
});
