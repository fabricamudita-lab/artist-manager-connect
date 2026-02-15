export interface MockEmailMessage {
  id: string;
  subject: string;
  from_address: string;
  from_name: string;
  to_addresses: { email: string; name: string }[];
  cc_addresses?: { email: string; name: string }[];
  snippet: string;
  body_html: string;
  date: string;
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive';
  labels: string[];
  thread_id: string;
  attachments?: { id: string; filename: string; mime_type: string; size_bytes: number }[];
  links?: { id: string; type: 'contact' | 'booking' | 'project'; entity_name: string; auto: boolean }[];
}

export interface MockEmailAccount {
  id: string;
  provider: 'gmail' | 'outlook';
  email_address: string;
  display_name: string;
  sync_enabled: boolean;
}

export const mockAccounts: MockEmailAccount[] = [
  {
    id: '1',
    provider: 'gmail',
    email_address: 'booking@moodita.es',
    display_name: 'Booking Moodita',
    sync_enabled: true,
  },
  {
    id: '2',
    provider: 'outlook',
    email_address: 'management@moodita.es',
    display_name: 'Management Moodita',
    sync_enabled: true,
  },
];

export const mockEmails: MockEmailMessage[] = [
  {
    id: '1',
    subject: 'Confirmación de fecha - Festival Sónar 2026',
    from_address: 'carlos@sonar.es',
    from_name: 'Carlos Durán',
    to_addresses: [{ email: 'booking@moodita.es', name: 'Booking Moodita' }],
    snippet: 'Hola! Te confirmo que la fecha del 18 de junio queda bloqueada para el show principal. Adjunto el contrato preliminar para su revisión...',
    body_html: '<p>Hola!</p><p>Te confirmo que la fecha del <strong>18 de junio</strong> queda bloqueada para el show principal.</p><p>Adjunto el contrato preliminar para su revisión. Necesitaríamos que nos lo devuelvan firmado antes del 1 de marzo.</p><p>Los detalles técnicos:</p><ul><li>Escenario principal - SónarNight</li><li>Horario: 01:00 - 02:30</li><li>Caché acordado: 15.000€</li></ul><p>Saludos,<br/>Carlos Durán<br/>Sónar Festival</p>',
    date: '2026-02-15T10:30:00Z',
    is_read: false,
    is_starred: true,
    is_draft: false,
    has_attachments: true,
    folder: 'inbox',
    labels: ['importante'],
    thread_id: 't1',
    attachments: [
      { id: 'a1', filename: 'contrato_sonar_2026.pdf', mime_type: 'application/pdf', size_bytes: 245000 },
    ],
    links: [
      { id: 'l1', type: 'contact', entity_name: 'Carlos Durán', auto: true },
      { id: 'l2', type: 'booking', entity_name: 'Festival Sónar 2026', auto: false },
    ],
  },
  {
    id: '2',
    subject: 'Re: Rider técnico actualizado',
    from_address: 'laura@soundcheck.com',
    from_name: 'Laura Martínez',
    to_addresses: [{ email: 'booking@moodita.es', name: 'Booking Moodita' }],
    snippet: 'Perfecto, he revisado el rider actualizado. Solo tengo una duda sobre el backline de teclados...',
    body_html: '<p>Perfecto, he revisado el rider actualizado.</p><p>Solo tengo una duda sobre el backline de teclados: ¿necesitan un Nord Stage 3 o aceptan el Nord Electro 6?</p><p>Gracias,<br/>Laura</p>',
    date: '2026-02-15T09:15:00Z',
    is_read: false,
    is_starred: false,
    is_draft: false,
    has_attachments: false,
    folder: 'inbox',
    labels: [],
    thread_id: 't2',
    links: [
      { id: 'l3', type: 'contact', entity_name: 'Laura Martínez', auto: true },
    ],
  },
  {
    id: '3',
    subject: 'Propuesta gira Latinoamérica - Septiembre 2026',
    from_address: 'ricardo@latamtouring.com',
    from_name: 'Ricardo Fernández',
    to_addresses: [{ email: 'booking@moodita.es', name: 'Booking Moodita' }],
    snippet: 'Estimados, les escribo para presentarles una propuesta de gira por 5 ciudades en Latinoamérica...',
    body_html: '<p>Estimados,</p><p>Les escribo para presentarles una propuesta de gira por 5 ciudades en Latinoamérica para septiembre 2026:</p><ol><li>Buenos Aires - Luna Park (12 sept)</li><li>Santiago - Movistar Arena (14 sept)</li><li>Bogotá - Movistar Arena (17 sept)</li><li>CDMX - Auditorio Nacional (20 sept)</li><li>Lima - Arena Perú (22 sept)</li></ol><p>Fee total propuesto: $120,000 USD + vuelos y hotel.</p><p>Quedamos atentos,<br/>Ricardo Fernández</p>',
    date: '2026-02-14T16:45:00Z',
    is_read: true,
    is_starred: true,
    is_draft: false,
    has_attachments: true,
    folder: 'inbox',
    labels: ['gira', 'importante'],
    thread_id: 't3',
    attachments: [
      { id: 'a2', filename: 'propuesta_latam_2026.pdf', mime_type: 'application/pdf', size_bytes: 1200000 },
      { id: 'a3', filename: 'venues_fotos.zip', mime_type: 'application/zip', size_bytes: 8500000 },
    ],
    links: [
      { id: 'l4', type: 'contact', entity_name: 'Ricardo Fernández', auto: true },
      { id: 'l5', type: 'project', entity_name: 'Gira LATAM 2026', auto: false },
    ],
  },
  {
    id: '4',
    subject: 'Factura #2026-042 - Concierto Wizink Center',
    from_address: 'admin@wizinkcenter.es',
    from_name: 'Administración Wizink',
    to_addresses: [{ email: 'management@moodita.es', name: 'Management Moodita' }],
    snippet: 'Adjuntamos factura correspondiente a la liquidación del concierto del pasado 8 de febrero...',
    body_html: '<p>Buenos días,</p><p>Adjuntamos factura correspondiente a la liquidación del concierto del pasado 8 de febrero.</p><p>Importe total: 22.500€ + IVA</p><p>Plazo de pago: 30 días.</p><p>Un saludo,<br/>Departamento de Administración<br/>Wizink Center</p>',
    date: '2026-02-14T11:20:00Z',
    is_read: true,
    is_starred: false,
    is_draft: false,
    has_attachments: true,
    folder: 'inbox',
    labels: ['facturación'],
    thread_id: 't4',
    attachments: [
      { id: 'a4', filename: 'factura_2026_042.pdf', mime_type: 'application/pdf', size_bytes: 89000 },
    ],
    links: [
      { id: 'l6', type: 'booking', entity_name: 'Wizink Center - Feb 2026', auto: false },
    ],
  },
  {
    id: '5',
    subject: 'Disponibilidad para sesión de fotos - Nuevo álbum',
    from_address: 'ana@fotostudio.com',
    from_name: 'Ana Belén Torres',
    to_addresses: [{ email: 'management@moodita.es', name: 'Management Moodita' }],
    snippet: '¡Hola! Quería confirmar si la semana del 24 de febrero les viene bien para la sesión de fotos del nuevo álbum...',
    body_html: '<p>¡Hola!</p><p>Quería confirmar si la semana del 24 de febrero les viene bien para la sesión de fotos del nuevo álbum. Tengo disponibilidad el martes y jueves de esa semana.</p><p>El estudio ya está reservado y tenemos todo el equipo listo.</p><p>¡Un abrazo!<br/>Ana Belén</p>',
    date: '2026-02-13T14:00:00Z',
    is_read: true,
    is_starred: false,
    is_draft: false,
    has_attachments: false,
    folder: 'inbox',
    labels: [],
    thread_id: 't5',
    links: [
      { id: 'l7', type: 'contact', entity_name: 'Ana Belén Torres', auto: true },
    ],
  },
  {
    id: '6',
    subject: 'Borrador: Propuesta de colaboración',
    from_address: 'booking@moodita.es',
    from_name: 'Booking Moodita',
    to_addresses: [{ email: 'info@festival.com', name: 'Festival Info' }],
    snippet: 'Estimados, nos ponemos en contacto para...',
    body_html: '<p>Estimados, nos ponemos en contacto para explorar una posible colaboración...</p>',
    date: '2026-02-12T08:00:00Z',
    is_read: true,
    is_starred: false,
    is_draft: true,
    has_attachments: false,
    folder: 'drafts',
    labels: [],
    thread_id: 't6',
  },
  {
    id: '7',
    subject: 'Re: Confirmación hotel Barcelona',
    from_address: 'booking@moodita.es',
    from_name: 'Booking Moodita',
    to_addresses: [{ email: 'reservas@hotelarts.com', name: 'Hotel Arts' }],
    snippet: 'Confirmamos la reserva para 4 habitaciones dobles del 17 al 19 de junio...',
    body_html: '<p>Confirmamos la reserva para 4 habitaciones dobles del 17 al 19 de junio.</p><p>Gracias por la atención.</p>',
    date: '2026-02-11T17:30:00Z',
    is_read: true,
    is_starred: false,
    is_draft: false,
    has_attachments: false,
    folder: 'sent',
    labels: [],
    thread_id: 't7',
  },
];

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive';

export const folderLabels: Record<EmailFolder, string> = {
  inbox: 'Bandeja de entrada',
  sent: 'Enviados',
  drafts: 'Borradores',
  trash: 'Papelera',
  archive: 'Archivo',
};
