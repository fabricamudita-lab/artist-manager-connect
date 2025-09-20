export interface BookingOffer {
  id: string;
  created_at: string;
  updated_at?: string;
  fecha?: string;
  artist_id?: string;
  project_id?: string;
  
  // Location and venue info
  pais?: string;
  ciudad?: string;
  lugar?: string;
  venue?: string;
  capacidad?: number;
  
  // Event details
  festival_ciclo?: string;
  estado?: string;
  phase?: string;
  promotor?: string;
  formato?: string;
  oferta?: string;
  
  // Financial
  fee?: number;
  gastos_estimados?: number;
  comision_porcentaje?: number;
  comision_euros?: number;
  es_cityzen?: boolean;
  es_internacional?: boolean;
  estado_facturacion?: string;
  
  // Contact and management
  contacto?: string;
  tour_manager?: string;
  
  // Documentation and links
  contratos?: string;
  link_venta?: string;
  inicio_venta?: string;
  folder_url?: string;
  
  // Additional info
  info_comentarios?: string;
  condiciones?: string;
  hora?: string;
  event_id?: string;
  
  // Status for centralized use
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  
  // Relations
  artist?: {
    id: string;
    name: string;
    email?: string;
  };
  project?: {
    id: string;
    name: string;
  };
}