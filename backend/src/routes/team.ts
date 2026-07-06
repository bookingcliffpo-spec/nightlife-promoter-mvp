import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { env } from '../env.js';

export const teamRouter = Router();
teamRouter.use(requireAuth);

teamRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const members = await prisma.user.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(members);
  })
);

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'STAFF'])
});

teamRouter.post(
  '/invite',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const { email, role } = InviteSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'This email is already part of a team.');

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.FRONTEND_URL}/auth/callback`
    });
    if (error || !data.user) {
      throw new HttpError(502, error?.message ?? 'Could not send the invite email.');
    }

    const member = await prisma.user.create({
      data: {
        id: data.user.id,
        email,
        role,
        organizationId: req.auth!.organizationId
      }
    });

    res.status(201).json(member);
  })
);

const RoleSchema = z.object({ role: z.enum(['ADMIN', 'STAFF']) });

teamRouter.patch(
  '/:userId/role',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const { role } = RoleSchema.parse(req.body);
    const { userId } = req.params;

    if (userId === req.auth!.userId) throw new HttpError(400, "You can't change your own role.");

    const member = await prisma.user.findFirst({ where: { id: userId, organizationId: req.auth!.organizationId } });
    if (!member) throw new HttpError(404, 'Team member not found.');
    if (member.role === 'OWNER') throw new HttpError(400, 'The organization owner cannot be reassigned here.');

    const updated = await prisma.user.update({ where: { id: userId }, data: { role } });
    res.json(updated);
  })
);

teamRouter.delete(
  '/:userId',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (userId === req.auth!.userId) throw new HttpError(400, "You can't remove yourself.");

    const member = await prisma.user.findFirst({ where: { id: userId, organizationId: req.auth!.organizationId } });
    if (!member) throw new HttpError(404, 'Team member not found.');
    if (member.role === 'OWNER') throw new HttpError(400, 'The organization owner cannot be removed.');

    await prisma.user.delete({ where: { id: userId } });
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);

    res.status(204).send();
  })
);
