// Zod validation for contract drafts (shared by generator + future edge functions)
import { z } from 'zod';

export const recordingTypeSchema = z.enum(['single', 'album', 'fullAlbum']);
export const languageSchema = z.enum(['es', 'en']);
export const draftTypeSchema = z.enum(['ip_license', 'booking']);

const optionalEmail = z
  .string()
  .trim()
  .email({ message: 'Email no válido' })
  .max(255)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const saveDraftSchema = z.object({
  draftType: draftTypeSchema,
  title: z.string().trim().min(1, 'Título obligatorio').max(200, 'Título demasiado largo'),
  formData: z.any(),
  clausesData: z.any().optional(),
  releaseId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  artistId: z.string().uuid().optional(),
  producerEmail: optionalEmail,
  collaboratorEmail: optionalEmail,
  recordingType: recordingTypeSchema.optional(),
  language: languageSchema.optional(),
});

export const updateDraftSchema = z.object({
  formData: z.any().optional(),
  clausesData: z.any().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  firmaFecha: z.string().max(50).optional(),
  firmaLugar: z.string().max(200).optional(),
  recordingType: recordingTypeSchema.optional(),
  language: languageSchema.optional(),
});

export type SaveDraftInput = z.infer<typeof saveDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
