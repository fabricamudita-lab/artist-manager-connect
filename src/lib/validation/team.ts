import { z } from 'zod';

/**
 * Validation schemas for team / membership operations.
 * Used by the InviteTeamMemberDialog and the invite-team-member edge function.
 *
 * Strict rules:
 * - email is trimmed, lowercased, RFC-validated, capped at 255 chars
 * - scope must be one of WORKSPACE | ARTIST | PROJECT
 * - scopeId must be a UUID
 * - role enum is constrained per scope (validated by .superRefine)
 */

export const WorkspaceRoleSchema = z.enum(['OWNER', 'TEAM_MANAGER']);
export const ArtistRoleSchema = z.enum([
  'ARTIST_MANAGER',
  'LABEL',
  'BOOKING_AGENT',
  'PRODUCER',
  'PUBLISHER',
  'AR',
  'ROADIE_TECH',
  'ARTIST_OBSERVER',
]);
export const ProjectRoleSchema = z.enum(['EDITOR', 'COMMENTER', 'VIEWER']);

export const ScopeSchema = z.enum(['WORKSPACE', 'ARTIST', 'PROJECT']);

const baseEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email demasiado corto')
  .max(255, 'Email demasiado largo')
  .email('Email no válido');

export const inviteMemberSchema = z
  .object({
    email: baseEmail,
    scope: ScopeSchema,
    scopeId: z.string().uuid('Identificador de recurso no válido'),
    role: z.string().min(1).max(64),
    teamCategory: z
      .enum(['management', 'banda', 'tecnico', 'artistico', 'comunicacion', 'legal', 'otro'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    const ok =
      (data.scope === 'WORKSPACE' && WorkspaceRoleSchema.safeParse(data.role).success) ||
      (data.scope === 'ARTIST' && ArtistRoleSchema.safeParse(data.role).success) ||
      (data.scope === 'PROJECT' && ProjectRoleSchema.safeParse(data.role).success);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role'],
        message: `Rol no compatible con el alcance ${data.scope}`,
      });
    }
  });

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateRoleSchema = z.object({
  bindingId: z.string().uuid(),
  scope: ScopeSchema,
  role: z.string().min(1).max(64),
});

export const removeMemberSchema = z.object({
  bindingId: z.string().uuid(),
  scope: ScopeSchema,
});
