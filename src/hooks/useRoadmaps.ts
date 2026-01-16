import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface LinkedBooking {
  id: string;
  festival_ciclo: string | null;
  lugar: string | null;
  ciudad: string | null;
  fecha: string | null;
  hora: string | null;
  promotor: string | null;
  artist_id: string | null;
  formato: string | null;
  artist?: {
    id: string;
    name: string;
  } | null;
}

export interface TourRoadmap {
  id: string;
  artist_id: string | null;
  booking_id: string | null; // Legacy single booking
  name: string;
  promoter: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
  artist?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  booking?: LinkedBooking | null; // Legacy single booking
  linkedBookings?: LinkedBooking[]; // New multiple bookings
}

export interface RoadmapBlock {
  id: string;
  roadmap_id: string;
  block_type: 'header' | 'schedule' | 'travel' | 'hospitality' | 'production' | 'contacts';
  sort_order: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useRoadmaps() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: roadmaps, isLoading } = useQuery({
    queryKey: ['tour-roadmaps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tour_roadmaps')
        .select(`
          *,
          artist:artists(id, name, avatar_url),
          booking:booking_offers(id, festival_ciclo, lugar, ciudad, fecha, hora, promotor, artist_id, formato)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TourRoadmap[];
    },
    enabled: !!user,
  });

  const createRoadmap = useMutation({
    mutationFn: async (values: { name: string; artist_id?: string; booking_id?: string; promoter?: string; start_date?: string; end_date?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tour_roadmaps')
        .insert({
          ...values,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmaps'] });
      toast({ title: 'Hoja de ruta creada' });
    },
    onError: (error) => {
      toast({ title: 'Error al crear hoja de ruta', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRoadmap = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tour_roadmaps')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmaps'] });
      toast({ title: 'Hoja de ruta eliminada' });
    },
  });

  return {
    roadmaps,
    isLoading,
    createRoadmap,
    deleteRoadmap,
  };
}

export function useRoadmap(id: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ['tour-roadmap', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('tour_roadmaps')
        .select(`
          *,
          artist:artists(id, name, avatar_url),
          booking:booking_offers(id, festival_ciclo, lugar, ciudad, fecha, hora, promotor, artist_id, formato)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TourRoadmap;
    },
    enabled: !!id && !!user,
  });

  // Fetch multiple linked bookings from junction table
  const { data: linkedBookings } = useQuery({
    queryKey: ['tour-roadmap-bookings', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('tour_roadmap_bookings')
        .select(`
          id,
          booking_id,
          sort_order,
          booking:booking_offers(id, festival_ciclo, lugar, ciudad, fecha, hora, promotor, artist_id, formato, artist:artists(id, name))
        `)
        .eq('roadmap_id', id)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      // Extract booking data
      return data.map(item => ({
        linkId: item.id,
        ...(item.booking as LinkedBooking),
      }));
    },
    enabled: !!id && !!user,
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['tour-roadmap-blocks', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('tour_roadmap_blocks')
        .select('*')
        .eq('roadmap_id', id)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as RoadmapBlock[];
    },
    enabled: !!id && !!user,
  });

  const updateRoadmap = useMutation({
    mutationFn: async (values: Partial<TourRoadmap>) => {
      if (!id) throw new Error('No roadmap ID');
      const { error } = await supabase
        .from('tour_roadmaps')
        .update(values)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmap', id] });
      queryClient.invalidateQueries({ queryKey: ['tour-roadmaps'] });
    },
  });

  // Add a booking link (to junction table)
  const addBookingLink = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!id) throw new Error('No roadmap ID');
      
      // Get current max sort order
      const maxOrder = linkedBookings?.reduce((max, b) => Math.max(max, 0), -1) ?? -1;
      
      const { error } = await supabase
        .from('tour_roadmap_bookings')
        .insert({
          roadmap_id: id,
          booking_id: bookingId,
          sort_order: maxOrder + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmap-bookings', id] });
      toast({ title: 'Evento vinculado' });
    },
    onError: (error) => {
      toast({ title: 'Error al vincular evento', description: error.message, variant: 'destructive' });
    },
  });

  // Remove a booking link (from junction table)
  const removeBookingLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('tour_roadmap_bookings')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmap-bookings', id] });
      toast({ title: 'Evento desvinculado' });
    },
  });

  const addBlock = useMutation({
    mutationFn: async (blockType: RoadmapBlock['block_type']) => {
      if (!id) throw new Error('No roadmap ID');
      
      const maxOrder = blocks?.reduce((max, b) => Math.max(max, b.sort_order), -1) ?? -1;
      
      const { data, error } = await supabase
        .from('tour_roadmap_blocks')
        .insert([{
          roadmap_id: id,
          block_type: blockType,
          sort_order: maxOrder + 1,
          data: getDefaultBlockData(blockType) as unknown as Record<string, never>,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmap-blocks', id] });
      toast({ title: 'Bloque añadido' });
    },
  });

  const updateBlock = useMutation({
    mutationFn: async ({ blockId, data: blockData }: { blockId: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('tour_roadmap_blocks')
        .update({ data: blockData as unknown as Record<string, never> })
        .eq('id', blockId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmap-blocks', id] });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from('tour_roadmap_blocks')
        .delete()
        .eq('id', blockId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-roadmap-blocks', id] });
      toast({ title: 'Bloque eliminado' });
    },
  });

  return {
    roadmap,
    blocks,
    linkedBookings: linkedBookings || [],
    isLoading: isLoading || blocksLoading,
    updateRoadmap,
    addBookingLink,
    removeBookingLink,
    addBlock,
    updateBlock,
    deleteBlock,
  };
}

function getDefaultBlockData(blockType: RoadmapBlock['block_type']): Record<string, unknown> {
  switch (blockType) {
    case 'header':
      return { artistName: '', tourTitle: '', localPromoter: '', globalDates: '' };
    case 'schedule':
      return { days: [] };
    case 'travel':
      return { trips: [], luggagePolicy: '' };
    case 'hospitality':
      return { hotels: [], roomingList: [], dietNotes: '' };
    case 'production':
      return { venues: [] };
    case 'contacts':
      return { contacts: [] };
    default:
      return {};
  }
}
