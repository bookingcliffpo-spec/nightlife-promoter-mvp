import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const organizationId = req.auth!.organizationId;
    const now = new Date();

    const [totalEvents, upcomingEvents, totalContacts, vipContacts, campaigns, revenueAgg, checkInCount, guestListAgg] =
      await Promise.all([
        prisma.event.count({ where: { organizationId } }),
        prisma.event.count({ where: { organizationId, startsAt: { gte: now }, status: { not: 'CANCELLED' } } }),
        prisma.contact.count({ where: { organizationId } }),
        prisma.contact.count({ where: { organizationId, vipLevel: { not: 'NONE' } } }),
        prisma.campaign.count({ where: { organizationId } }),
        prisma.event.aggregate({
          where: { organizationId },
          _sum: { actualRevenue: true, projectedBarRevenue: true, coverCharge: true }
        }),
        prisma.checkIn.count({ where: { event: { organizationId } } }),
        prisma.guestListEntry.aggregate({
          where: { event: { organizationId } },
          _sum: { partySize: true },
          _count: true
        })
      ]);

    const expectedGuests = guestListAgg._sum.partySize ?? 0;
    const attendanceRate = expectedGuests > 0 ? Math.round((checkInCount / expectedGuests) * 100) : 0;

    res.json({
      totalEvents,
      upcomingEvents,
      totalContacts,
      vipContacts,
      totalCampaigns: campaigns,
      totalRevenue: revenueAgg._sum.actualRevenue ?? 0,
      projectedRevenue: revenueAgg._sum.projectedBarRevenue ?? 0,
      totalCheckIns: checkInCount,
      expectedGuests,
      attendanceRate
    });
  })
);

analyticsRouter.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: { startsAt: true, actualRevenue: true, projectedBarRevenue: true, coverCharge: true },
      orderBy: { startsAt: 'asc' }
    });

    const byMonth = new Map<string, { month: string; actual: number; projected: number }>();
    for (const event of events) {
      const key = `${event.startsAt.getFullYear()}-${String(event.startsAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = byMonth.get(key) ?? { month: key, actual: 0, projected: 0 };
      bucket.actual += event.actualRevenue;
      bucket.projected += event.projectedBarRevenue + event.coverCharge;
      byMonth.set(key, bucket);
    }

    res.json(Array.from(byMonth.values()));
  })
);

analyticsRouter.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { _count: { select: { checkIns: true, guestListEntries: true } } },
      orderBy: { startsAt: 'asc' },
      take: 24
    });

    res.json(
      events.map((event) => ({
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        expectedGuests: event.expectedGuests,
        rsvpCount: event._count.guestListEntries,
        checkedIn: event._count.checkIns
      }))
    );
  })
);

analyticsRouter.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: {
        recipients: { select: { status: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 24
    });

    res.json(
      campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        channel: c.channel,
        status: c.status,
        total: c.recipients.length,
        sent: c.recipients.filter((r) => r.status === 'SENT').length,
        failed: c.recipients.filter((r) => r.status === 'FAILED').length
      }))
    );
  })
);
