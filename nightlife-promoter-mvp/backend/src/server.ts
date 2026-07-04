import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { eventsRouter } from './routes/events.js';
import { contactsRouter } from './routes/contacts.js';
import { campaignsRouter } from './routes/campaigns.js';
import { integrationsRouter } from './routes/integrations.js';
import { dashboardRouter } from './routes/dashboard.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'nightlife-promoter-backend' }));
app.use('/api/dashboard', dashboardRouter);
app.use('/api/events', eventsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/integrations', integrationsRouter);

app.listen(port, () => console.log(`API running on http://localhost:${port}`));
