import { toast } from '@/hooks/use-toast';

/**
 * Detecta si un error de Supabase corresponde a una violación de RLS
 * (`42501` = insufficient_privilege) o al mensaje genérico de RLS.
 */
export function isPermissionError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null | undefined;
  if (!e) return false;
  if (e.code === '42501') return true;
  return /row[- ]level security/i.test(String(e.message ?? ''));
}

/**
 * Helper transversal: si el error proviene de RLS muestra un toast claro
 * "Permiso denegado"; en caso contrario, muestra el mensaje del error como
 * `destructive` con el `fallbackTitle` indicado.
 *
 * Devuelve `true` si era un error de permisos (útil para early-return).
 */
export function handleSupabaseError(err: unknown, fallbackTitle = 'Error'): boolean {
  if (isPermissionError(err)) {
    toast({
      title: 'Permiso denegado',
      description: 'No tienes permisos para realizar esta acción. Pide a un administrador del workspace que ajuste tu rol.',
      variant: 'destructive',
    });
    return true;
  }
  const e = err as { message?: string } | null | undefined;
  toast({
    title: fallbackTitle,
    description: e?.message ?? 'Error desconocido',
    variant: 'destructive',
  });
  return false;
}
