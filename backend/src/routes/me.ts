import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.userId },
      include: { organization: true }
    });
    res.json(user);
  })
);

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(120).optional()
});

meRouter.patch(
  '/organization',
  asyncHandler(async (req, res) => {
    const parsed = UpdateOrgSchema.parse(req.body);
    const org = await prisma.organization.update({
      where: { id: req.auth!.organizationId },
      data: parsed
    });
    res.json(org);
  })
);
