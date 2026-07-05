import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? 'demo@nightlifepromoter.ai';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'NightlifeDemo123!';

async function ensureDemoSupabaseUser(): Promise<string> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping Supabase Auth user creation. Using a local placeholder id instead.'
    );
    return 'seed-local-demo-user';
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === DEMO_EMAIL);
  if (found) return found.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Demo Promoter' }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create demo Supabase auth user: ${error?.message}`);
  }

  return data.user.id;
}

async function main() {
  const demoUserId = await ensureDemoSupabaseUser();

  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-nightlife-group' },
    update: {},
    create: {
      name: 'Demo Nightlife Group',
      slug: 'demo-nightlife-group',
      planTier: 'PRO',
      subscriptionStatus: 'ACTIVE',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {},
    create: {
      id: demoUserId,
      email: DEMO_EMAIL,
      name: 'Demo Promoter',
      role: 'OWNER',
      organizationId: organization.id
    }
  });

  const venue = await prisma.venue.upsert({
    where: { id: 'seed-venue-1' },
    update: {},
    create: {
      id: 'seed-venue-1',
      organizationId: organization.id,
      name: 'The Velvet Room',
      address: '123 Ocean Drive',
      city: 'Miami',
      state: 'FL',
      capacity: 500,
      timezone: 'America/New_York'
    }
  });

  const tagVip = await prisma.tag.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'VIP' } },
    update: {},
    create: { organizationId: organization.id, name: 'VIP', color: '#facc15' }
  });
  const tagRegular = await prisma.tag.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Regular' } },
    update: {},
    create: { organizationId: organization.id, name: 'Regular', color: '#38bdf8' }
  });

  const now = new Date();
  const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const event1 = await prisma.event.upsert({
    where: { slug: 'neon-saturdays-launch' },
    update: {},
    create: {
      organizationId: organization.id,
      venueId: venue.id,
      title: 'Neon Saturdays Launch',
      slug: 'neon-saturdays-launch',
      description: 'The season-opening party with resident DJs, bottle service, and a light show.',
      status: 'PUBLISHED',
      startsAt: inDays(10),
      endsAt: inDays(10.3),
      capacity: 500,
      coverCharge: 30,
      expectedGuests: 350,
      projectedBarRevenue: 18000,
      actualRevenue: 0
    }
  });

  const event2 = await prisma.event.upsert({
    where: { slug: 'industry-night-throwback' },
    update: {},
    create: {
      organizationId: organization.id,
      venueId: venue.id,
      title: 'Industry Night Throwback',
      slug: 'industry-night-throwback',
      description: 'Hip-hop and R&B throwback night for service industry professionals.',
      status: 'COMPLETED',
      startsAt: inDays(-14),
      endsAt: inDays(-13.7),
      capacity: 400,
      coverCharge: 20,
      expectedGuests: 280,
      projectedBarRevenue: 12000,
      actualRevenue: 13400
    }
  });

  const contacts = await Promise.all(
    [
      { firstName: 'Ava', lastName: 'Martinez', email: 'ava.martinez@example.com', phone: '+13055550101', vipLevel: 'PLATINUM' as const },
      { firstName: 'Liam', lastName: 'Johnson', email: 'liam.johnson@example.com', phone: '+13055550102', vipLevel: 'GOLD' as const },
      { firstName: 'Sofia', lastName: 'Rossi', email: 'sofia.rossi@example.com', phone: '+13055550103', vipLevel: 'NONE' as const },
      { firstName: 'Noah', lastName: 'Kim', email: 'noah.kim@example.com', phone: '+13055550104', vipLevel: 'SILVER' as const },
      { firstName: 'Mia', lastName: 'Chen', email: 'mia.chen@example.com', phone: '+13055550105', vipLevel: 'NONE' as const }
    ].map((c, i) =>
      prisma.contact.create({
        data: {
          organizationId: organization.id,
          ...c,
          source: 'seed',
          tags: { create: [{ tagId: i % 2 === 0 ? tagVip.id : tagRegular.id }] }
        }
      })
    )
  );

  await prisma.guestListEntry.createMany({
    data: contacts.slice(0, 3).map((c, i) => ({
      eventId: event1.id,
      contactId: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone,
      partySize: i + 1,
      listType: i === 0 ? 'VIP' : 'GENERAL'
    }))
  });

  await prisma.campaign.create({
    data: {
      organizationId: organization.id,
      eventId: event1.id,
      name: 'Neon Saturdays — Email Blast',
      channel: 'EMAIL',
      subject: 'RSVP now for Neon Saturdays',
      message: 'Get on the list for Neon Saturdays Launch — the biggest party of the season.',
      status: 'DRAFT',
      audienceTagIds: [tagVip.id]
    }
  });

  console.log('Seed complete.');
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
