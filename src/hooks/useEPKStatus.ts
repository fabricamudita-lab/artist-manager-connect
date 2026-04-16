import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface EPKStatus {
  id?: string;
  status: 'no_creado' | 'borrador' | 'publicado';
  slug?: string;
  titulo?: string;
  visibilidad?: 'publico' | 'privado' | 'protegido_password';
  created_at?: string;
  updated_at?: string;
}

export const useEPKStatus = (projectId?: string, artistId?: string) => {
  const { profile } = useAuth();
  const [epkStatus, setEpkStatus] = useState<EPKStatus>({ status: 'no_creado' });
  const [loading, setLoading] = useState(false);

  const fetchEPKStatus = async () => {
    if (!projectId && !artistId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('epks')
        .select('id, slug, titulo, visibilidad, creado_en, actualizado_en')
        .eq('creado_por', profile?.id);

      if (projectId) {
        query = query.eq('proyecto_id', projectId);
      } else if (artistId) {
        // EPKs don't have direct artist_id, they're linked through projects
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const status = data.visibilidad === 'publico' ? 'publicado' : 'borrador';
        setEpkStatus({
          id: data.id,
          status,
          slug: data.slug,
          titulo: data.titulo,
          visibilidad: data.visibilidad,
          created_at: data.creado_en,
          updated_at: data.actualizado_en
        });
      } else {
        setEpkStatus({ status: 'no_creado' });
      }
    } catch (error) {
      console.error('Error fetching EPK status:', error);
      setEpkStatus({ status: 'no_creado' });
    } finally {
      setLoading(false);
    }
  };

  const createEPK = async (prefillData: { titulo: string; artista_proyecto: string; portada_url?: string }) => {
    if (!profile?.id) return null;

    try {
      // Generate slug using Supabase function
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_epk_slug', { artista_proyecto: prefillData.artista_proyecto });

      if (slugError) throw slugError;

      const epkData = {
        titulo: prefillData.titulo,
        artista_proyecto: prefillData.artista_proyecto,
        imagen_portada: prefillData.portada_url || null,
        visibilidad: 'privado' as const,
        creado_por: profile.id,
        proyecto_id: projectId || null,
        presupuesto_id: projectId || null, // For budgets
        slug: slugData
      };

      const { data, error } = await supabase
        .from('epks')
        .insert(epkData)
        .select()
        .single();

      if (error) throw error;

      // Refresh status
      await fetchEPKStatus();

      return data;
    } catch (error) {
      console.error('Error creating EPK:', error);
      throw error;
    }
  };

  const getEPKUrl = () => {
    if (epkStatus.slug) {
      return `${PUBLIC_APP_URL}/epk/${epkStatus.slug}`;
    }
    return null;
  };

  useEffect(() => {
    if (profile?.id) {
      fetchEPKStatus();
    }
  }, [projectId, artistId, profile?.id]);

  return {
    epkStatus,
    loading,
    createEPK,
    getEPKUrl,
    refreshStatus: fetchEPKStatus
  };
};