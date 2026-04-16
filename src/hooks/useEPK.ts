import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type EPKDatabase = Database['public']['Tables']['epks']['Row'];
type EPKInsert = Database['public']['Tables']['epks']['Insert'];
type EPKUpdate = Database['public']['Tables']['epks']['Update'];

export interface EPKData {
  id: string;
  titulo: string;
  artista_proyecto: string;
  tagline?: string;
  bio_corta?: string;
  imagen_portada?: string;
  nota_prensa_pdf?: string;
  visibilidad: 'publico' | 'privado' | 'protegido_password';
  tema: 'claro' | 'oscuro' | 'auto';
  etiquetas: string[];
  permitir_zip: boolean;
  rastrear_analiticas: boolean;
  slug?: string;
  password_hash?: string;
  expira_el?: string;
  acceso_directo: boolean;
  vistas_totales?: number;
  vistas_unicas?: number;
  descargas_totales?: number;
  ultima_vista_en?: string;
  creado_por: string;
  creado_en: string;
  actualizado_en: string;
  artist_id?: string | null;
  tour_manager: ContactInfo;
  tour_production: ContactInfo;
  coordinadora_booking: ContactInfo;
  management: ContactInfo;
  booking: ContactInfo;
  proyecto_id?: string;
  presupuesto_id?: string;
}

export interface ContactInfo {
  nombre: string;
  email: string;
  telefono: string;
  whatsapp: string;
  mostrar: boolean;
}

export interface EPKPhoto {
  id?: string;
  epk_id: string;
  titulo?: string;
  url: string;
  descargable: boolean;
  orden: number;
}

export interface EPKVideo {
  id?: string;
  epk_id: string;
  tipo: 'youtube' | 'vimeo' | 'archivo';
  url?: string;
  video_id?: string;
  titulo: string;
  privado: boolean;
  orden: number;
}

export interface EPKAudio {
  id?: string;
  epk_id: string;
  url: string;
  titulo: string;
  orden: number;
}

export interface EPKDocument {
  id?: string;
  epk_id: string;
  titulo: string;
  tipo?: string;
  url: string;
  file_type?: string;
  file_size?: number;
  orden: number;
}

const defaultContactInfo: ContactInfo = {
  nombre: '',
  email: '',
  telefono: '',
  whatsapp: '',
  mostrar: false
};

export const defaultEPKData: Partial<EPKData> = {
  slug: '',
  titulo: '',
  artista_proyecto: '',
  tagline: '',
  tema: 'auto',
  bio_corta: '',
  tour_manager: defaultContactInfo,
  tour_production: defaultContactInfo,
  coordinadora_booking: defaultContactInfo,
  management: defaultContactInfo,
  booking: defaultContactInfo,
  visibilidad: 'privado',
  permitir_zip: true,
  rastrear_analiticas: true,
  etiquetas: [],
  vistas_totales: 0,
  descargas_totales: 0
};

export const useEPK = (epkId?: string) => {
  const [epk, setEPK] = useState<Partial<EPKData>>(defaultEPKData);
  const [photos, setPhotos] = useState<EPKPhoto[]>([]);
  const [videos, setVideos] = useState<EPKVideo[]>([]);
  const [audios, setAudios] = useState<EPKAudio[]>([]);
  const [documents, setDocuments] = useState<EPKDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (epkId) {
      fetchEPK(epkId);
    }
  }, [epkId]);

  const parseContactInfo = (jsonData: any): ContactInfo => {
    if (typeof jsonData === 'object' && jsonData !== null) {
      return {
        nombre: jsonData.nombre || '',
        email: jsonData.email || '',
        telefono: jsonData.telefono || '',
        whatsapp: jsonData.whatsapp || '',
        mostrar: jsonData.mostrar || false
      };
    }
    return defaultContactInfo;
  };

  const fetchEPK = async (id: string) => {
    setLoading(true);
    try {
      const { data: epkData, error: epkError } = await supabase
        .from('epks')
        .select('*')
        .eq('id', id)
        .single();

      if (epkError) throw epkError;

      // Parse JSON fields safely
      const parsedEPK: Partial<EPKData> = {
        ...epkData,
        tour_manager: parseContactInfo(epkData.tour_manager),
        tour_production: parseContactInfo(epkData.tour_production),
        coordinadora_booking: parseContactInfo(epkData.coordinadora_booking),
        management: parseContactInfo(epkData.management),
        booking: parseContactInfo(epkData.booking),
        etiquetas: epkData.etiquetas || []
      };

      setEPK(parsedEPK);

      // Fetch related media
      const [photosResult, videosResult, audiosResult, documentsResult] = await Promise.all([
        supabase.from('epk_fotos').select('*').eq('epk_id', id).order('orden'),
        supabase.from('epk_videos').select('*').eq('epk_id', id).order('orden'),
        supabase.from('epk_audios').select('*').eq('epk_id', id).order('orden'),
        supabase.from('epk_documentos').select('*').eq('epk_id', id).order('orden')
      ]);

      if (photosResult.data) setPhotos(photosResult.data);
      if (videosResult.data) setVideos(videosResult.data);
      if (audiosResult.data) setAudios(audiosResult.data);
      if (documentsResult.data) setDocuments(documentsResult.data);

    } catch (error) {
      console.error('Error fetching EPK:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el EPK",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveEPK = async (): Promise<string | null> => {
    setSaving(true);
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Prepare data for database
      const dbData: EPKUpdate = {
        slug: epk.slug,
        titulo: epk.titulo,
        artista_proyecto: epk.artista_proyecto,
        tagline: epk.tagline,
        imagen_portada: epk.imagen_portada,
        tema: epk.tema as any,
        bio_corta: epk.bio_corta,
        nota_prensa_pdf: epk.nota_prensa_pdf,
        tour_manager: epk.tour_manager as any,
        tour_production: epk.tour_production as any,
        coordinadora_booking: epk.coordinadora_booking as any,
        management: epk.management as any,
        booking: epk.booking as any,
        visibilidad: epk.visibilidad as any,
        password_hash: epk.password_hash,
        expira_el: epk.expira_el,
        permitir_zip: epk.permitir_zip,
        rastrear_analiticas: epk.rastrear_analiticas,
        presupuesto_id: epk.presupuesto_id,
        proyecto_id: epk.proyecto_id,
        etiquetas: epk.etiquetas,
        artist_id: epk.artist_id || null
      };

      if (epkId) {
        // Update existing EPK
        const { error } = await supabase
          .from('epks')
          .update(dbData)
          .eq('id', epkId);

        if (error) throw error;

        toast({
          title: "EPK actualizado",
          description: "Los cambios se han guardado correctamente"
        });

        return epkId;
      } else {
        // Create new EPK
        const insertData: EPKInsert = {
          ...dbData,
          creado_por: user.id,
          titulo: epk.titulo || '',
          artista_proyecto: epk.artista_proyecto || '',
          slug: epk.slug || ''
        };

        const { data, error } = await supabase
          .from('epks')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "EPK creado",
          description: "El EPK se ha creado correctamente"
        });

        // Parse the returned data
        const parsedData: Partial<EPKData> = {
          ...data,
          tour_manager: parseContactInfo(data.tour_manager),
          tour_production: parseContactInfo(data.tour_production),
          coordinadora_booking: parseContactInfo(data.coordinadora_booking),
          management: parseContactInfo(data.management),
          booking: parseContactInfo(data.booking),
          etiquetas: data.etiquetas || []
        };

        setEPK(parsedData);
        return data.id;
      }
    } catch (error) {
      console.error('Error saving EPK:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el EPK",
        variant: "destructive"
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateEPK = (updates: Partial<EPKData>) => {
    setEPK(prev => ({ ...prev, ...updates }));
  };

  const addPhoto = async (photo: Omit<EPKPhoto, 'id' | 'epk_id'>, epkId: string) => {
    try {
      const { data, error } = await supabase
        .from('epk_fotos')
        .insert({ ...photo, epk_id: epkId })
        .select()
        .single();

      if (error) throw error;

      setPhotos(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding photo:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir la foto",
        variant: "destructive"
      });
      return null;
    }
  };

  const addVideo = async (video: Omit<EPKVideo, 'id' | 'epk_id'>, epkId: string) => {
    try {
      const { data, error } = await supabase
        .from('epk_videos')
        .insert({ ...video, epk_id: epkId })
        .select()
        .single();

      if (error) throw error;

      setVideos(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding video:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el video",
        variant: "destructive"
      });
      return null;
    }
  };

  const addAudio = async (audio: Omit<EPKAudio, 'id' | 'epk_id'>, epkId: string) => {
    try {
      const { data, error } = await supabase
        .from('epk_audios')
        .insert({ ...audio, epk_id: epkId })
        .select()
        .single();

      if (error) throw error;

      setAudios(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding audio:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el audio",
        variant: "destructive"
      });
      return null;
    }
  };

  const addDocument = async (document: Omit<EPKDocument, 'id' | 'epk_id'>, epkId: string) => {
    try {
      const { data, error } = await supabase
        .from('epk_documentos')
        .insert({ ...document, epk_id: epkId })
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el documento",
        variant: "destructive"
      });
      return null;
    }
  };

  const validateEPK = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!epk.titulo?.trim()) {
      errors.push('El título es obligatorio');
    }

    if (!epk.slug?.trim()) {
      errors.push('El slug es obligatorio');
    }

    // Validar que al menos tenga un bloque de material o nota de prensa
    const hasContent = 
      photos.length > 0 || 
      videos.length > 0 || 
      audios.length > 0 || 
      documents.length > 0 || 
      epk.nota_prensa_pdf?.trim() ||
      epk.bio_corta?.trim();

    if (!hasContent) {
      errors.push('Debe incluir al menos una biografía, nota de prensa o material multimedia');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const generateLink = async (): Promise<{ success: boolean; slug?: string; url?: string; error?: string }> => {
    if (!epk?.id || !epk?.artista_proyecto) {
      return { success: false, error: 'EPK no válido' };
    }

    try {
      // Generate slug using database function
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_epk_slug', { artista_proyecto: epk.artista_proyecto });

      if (slugError) {
        console.error('Error generating slug:', slugError);
        return { success: false, error: 'Error al generar el slug' };
      }

      // Update EPK with the new slug
      const { error: updateError } = await supabase
        .from('epks')
        .update({ slug: slugData })
        .eq('id', epk.id);

      if (updateError) {
        console.error('Error updating EPK slug:', updateError);
        return { success: false, error: 'Error al guardar el enlace' };
      }

      // Update local state
      setEPK(prev => prev ? { ...prev, slug: slugData } : prev);

      const fullUrl = `${PUBLIC_APP_URL}/epk/${slugData}`;
      return { success: true, slug: slugData, url: fullUrl };
    } catch (error) {
      console.error('Error generating link:', error);
      return { success: false, error: 'Error inesperado' };
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  };

  const generateSlug = (titulo: string): string => {
    return titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .slice(0, 50); // Limit length
  };

  return {
    epk,
    photos,
    videos,
    audios,
    documents,
    loading,
    saving,
    updateEPK,
    saveEPK,
    addPhoto,
    addVideo,
    addAudio,
    addDocument,
    validateEPK,
    generateSlug,
    generateLink,
    copyToClipboard,
    setPhotos,
    setVideos,
    setAudios,
    setDocuments
  };
};