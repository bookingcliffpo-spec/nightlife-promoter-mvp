import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { supabaseAdmin, FLYER_BUCKET } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';

export const flyersRouter = Router();

flyersRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      cb(new HttpError(400, 'Only PNG, JPEG, WEBP, or GIF images are allowed'));
      return;
    }
    cb(null, true);
  }
});

flyersRouter.post(
  '/event/:eventId',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId, organizationId: req.auth!.organizationId }
    });
    if (!event) throw new HttpError(404, 'Event not found');
    if (!req.file) throw new HttpError(400, 'No file uploaded');

    const ext = req.file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const storagePath = `${req.auth!.organizationId}/${event.id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(FLYER_BUCKET)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) throw new HttpError(500, `Upload failed: ${uploadError.message}`);

    const { data: publicUrl } = supabaseAdmin.storage.from(FLYER_BUCKET).getPublicUrl(storagePath);

    const flyer = await prisma.flyer.create({
      data: {
        eventId: event.id,
        url: publicUrl.publicUrl,
        storagePath
      }
    });

    res.status(201).json(flyer);
  })
);

flyersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const flyer = await prisma.flyer.findFirst({
      where: { id: req.params.id, event: { organizationId: req.auth!.organizationId } }
    });
    if (!flyer) throw new HttpError(404, 'Flyer not found');

    await supabaseAdmin.storage.from(FLYER_BUCKET).remove([flyer.storagePath]);
    await prisma.flyer.delete({ where: { id: flyer.id } });
    res.status(204).send();
  })
);
