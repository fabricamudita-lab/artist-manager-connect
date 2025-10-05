import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hptjzbaiclmgbvxlmllo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const firstNames = [
  'Ana', 'Carlos', 'María', 'David', 'Laura', 'Javier', 'Carmen', 'Miguel', 'Isabel', 'Pedro',
  'Sara', 'Antonio', 'Elena', 'Francisco', 'Patricia', 'José', 'Marta', 'Manuel', 'Cristina', 'Alejandro',
  'Beatriz', 'Daniel', 'Raquel', 'Pablo', 'Silvia', 'Fernando', 'Natalia', 'Alberto', 'Lucía', 'Sergio',
  'Andrea', 'Jorge', 'Mónica', 'Roberto', 'Victoria', 'Ángel', 'Diana', 'Luis', 'Eva', 'Marcos',
  'Irene', 'Adrián', 'Clara', 'Rubén', 'Alicia', 'Iván', 'Pilar', 'Óscar', 'Rosa', 'Guillermo'
];

const lastNames = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín',
  'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez',
  'Molina', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias', 'Medina', 'Garrido', 'Cortés',
  'Castillo', 'Santos', 'Lozano', 'Guerrero', 'Cano', 'Prieto', 'Méndez', 'Cruz', 'Gallego', 'Vidal'
];

const companies = {
  prensa: [
    'El País', 'Rockdelux', 'Mondosonoro', 'Jenesaispop', 'El Periódico', 'La Vanguardia', 
    'ABC Cultural', 'Rolling Stone España', 'Ruta 66', 'PlayGround', 'Vice España', 
    'Cadena SER', 'RNE Radio 3', 'Los 40', 'Europa FM', 'Kiss FM', 'Onda Cero',
    'Catalunya Ràdio', 'RAC1', 'iCat', 'TimeOut', 'Gq España', 'Vanity Fair'
  ],
  major: [
    'Universal Music Spain', 'Sony Music Spain', 'Warner Music Spain', 
    'BMG Spain', 'The Orchard', 'PIAS Iberia'
  ],
  indie: [
    'Ernie Records', 'Mushroom Pillow', 'La Castanya', 'Subterfuge Records',
    'Foehn Records', 'Propaganda pel Fet', 'Origami Records', 'Limbo Starr',
    'Everlasting Records', 'Música Global', 'BCore', 'Irregular Records',
    'Matapadre Records', 'Producciones Doradas', 'Grabaciones en el Mar'
  ],
  distributor: [
    'Altafonte', 'The Orchard España', 'Believe Digital', 'Ditto Music',
    'DistroKid España', 'CD Baby', 'Idol', 'Kartel Music Group', 'Popstock'
  ],
  venue: [
    'Primavera Sound', 'FIB', 'Mad Cool', 'Sónar', 'BBK Live', 'Arenal Sound',
    'Vida Festival', 'O Son do Camiño', 'Cruïlla', 'Cap Roig Festival',
    'Sala Apolo', 'Razzmatazz', 'WiZink Center', 'Palau Sant Jordi', 'IFEMA',
    'Sala But', 'Loco Club', 'Sala Salamandra', 'Sala Siroco', 'Joy Eslava'
  ],
  management: [
    'The Music Republic', 'Tiempo Libre Management', 'Bankrobber', 
    'La Factoría del Ritmo', 'Producciones Doradas', 'Snap! Management',
    'Wild Management', 'One Eyed Jacks', 'Música Global Management'
  ],
  booking: [
    'Live Nation España', 'The Music Republic Concerts', 'Producciones Doradas Live',
    'Doctor Music', 'Last Tour International', 'Madness Live', 'Groove Concerts',
    'Good Vibe Concerts', 'Parque Móvil Concerts', 'Vía Célere Entertainment'
  ],
  marketing: [
    'Believe Digital Marketing', 'Virgin Music Spain', 'Altafonte Marketing',
    'Propaganda pel Fet Media', 'Snap! Digital', 'The Music Republic Digital',
    'PlayGround Studio', 'Domestica Creative', 'Kanadá Agency'
  ],
  legal: [
    'Gradiant Abogados', 'Aznar & Muñoz Legal', 'LexMusic', 
    'Mariscal & Abogados', 'Suñol Entretenimiento Legal', 'Sánchez-Puelles y Asociados'
  ],
  production: [
    'El Callejón Estudio', 'Reno Estudio', 'Snap! Studios', 'Música Global Studios',
    'Audiomatic', 'Estudios Uno', 'Estudios Gema', 'Red Led Studios', 'The Family'
  ],
  photo: [
    'Freelance Photography', 'Contrast Fotografía', 'Studio Vision',
    'Snap Collective', 'Visual Arts BCN', 'Momento Foto'
  ],
  video: [
    'Canada Films', 'Boogaloo Films', 'Canadá', 'Contrast BCN',
    'Division Films', 'The Family Production', 'Brutal Media'
  ]
};

const cities = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Zaragoza',
  'Murcia', 'Palma', 'Las Palmas', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo',
  'Gijón', 'Hospitalet', 'Vitoria', 'Granada', 'Elche', 'Oviedo', 'Badalona',
  'Cartagena', 'Terrassa', 'Jerez', 'Sabadell', 'Móstoles', 'Santa Cruz', 'Pamplona',
  'Almería', 'Fuenlabrada', 'San Sebastián', 'Burgos', 'Albacete', 'Santander',
  'Castellón', 'Alcalá', 'León', 'Logroño', 'Cádiz', 'Tarragona'
];

const contactTypes = [
  {
    category: 'prensa',
    roles: [
      'Periodista Musical',
      'Director/a de Contenidos',
      'Redactor/a Jefe',
      'Colaborador/a',
      'Editor/a Cultural',
      'Crítico/a Musical',
      'Locutor/a Radio',
      'Productor/a Radio',
      'Director/a Programa'
    ]
  },
  {
    category: 'ar_label',
    roles: [
      'A&R Director',
      'A&R Manager',
      'Label Manager',
      'Product Manager',
      'International Manager',
      'Talent Scout'
    ]
  },
  {
    category: 'distribuidor',
    roles: [
      'Distribution Manager',
      'Digital Distribution',
      'International Distribution',
      'Account Manager'
    ]
  },
  {
    category: 'promotor',
    roles: [
      'Promotor/a',
      'Booker',
      'Festival Director',
      'Venue Manager',
      'Production Manager',
      'Tour Manager'
    ]
  },
  {
    category: 'management',
    roles: [
      'Manager',
      'Artist Manager',
      'Tour Manager',
      'Business Manager',
      'Day-to-Day Manager'
    ]
  },
  {
    category: 'booking',
    roles: [
      'Booking Agent',
      'International Booking',
      'Festival Booking',
      'Regional Booking Agent'
    ]
  },
  {
    category: 'marketing',
    roles: [
      'Marketing Manager',
      'Digital Marketing',
      'Social Media Manager',
      'PR Manager',
      'Campaign Manager',
      'Brand Manager'
    ]
  },
  {
    category: 'legal',
    roles: [
      'Abogado/a de Entretenimiento',
      'Abogado/a Musical',
      'Legal Advisor',
      'Copyright Specialist',
      'Contract Specialist'
    ]
  },
  {
    category: 'productor',
    roles: [
      'Productor Musical',
      'Ingeniero de Sonido',
      'Mixing Engineer',
      'Mastering Engineer',
      'Beat Maker',
      'Compositor/a'
    ]
  },
  {
    category: 'artista',
    roles: [
      'Cantante',
      'Músico/a',
      'DJ',
      'Productor/a y Artista',
      'Compositor/a y Cantante'
    ]
  },
  {
    category: 'fotografia',
    roles: [
      'Fotógrafo/a Musical',
      'Fotógrafo/a de Conciertos',
      'Fotógrafo/a de Prensa',
      'Fotógrafo/a de Estudio'
    ]
  },
  {
    category: 'video',
    roles: [
      'Director/a de Videoclips',
      'Director/a de Fotografía',
      'Editor/a de Video',
      'Producer Audiovisual'
    ]
  }
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateEmail(firstName: string, lastName: string, company: string): string {
  const cleanCompany = company
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  const cleanFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanLast = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const formats = [
    `${cleanFirst}.${cleanLast}@${cleanCompany}.com`,
    `${cleanFirst}${cleanLast}@${cleanCompany}.es`,
    `${cleanFirst[0]}${cleanLast}@${cleanCompany}.com`,
    `${cleanFirst}@${cleanCompany}.es`
  ];
  
  return randomElement(formats);
}

function generatePhone(): string {
  const prefixes = ['6', '7'];
  const prefix = randomElement(prefixes);
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `+34 ${prefix}${number}`;
}

async function createContacts() {
  console.log('🎵 Generando contactos del ecosistema musical...\n');

  // Get current user to use as created_by
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user found');
    process.exit(1);
  }

  const contactsToCreate = [];

  // Generate contacts for each category
  for (const type of contactTypes) {
    const companyList = companies[type.category as keyof typeof companies] || ['Freelance'];
    const contactsPerCompany = type.category === 'prensa' ? 3 : 
                               type.category === 'ar_label' ? 4 :
                               type.category === 'artista' ? 5 : 2;

    for (const company of companyList) {
      for (let i = 0; i < contactsPerCompany; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const role = randomElement(type.roles);
        const city = randomElement(cities);
        const email = generateEmail(firstName, lastName, company);
        const phone = Math.random() > 0.3 ? generatePhone() : null; // 70% have phone

        const notes = Math.random() > 0.7 ? [
          'Contacto muy receptivo a nuevas propuestas',
          'Preferible contactar por email',
          'Disponible para reuniones presenciales',
          'Interesado en proyectos indie',
          'Especializado en música urbana',
          'Contacto establecido desde 2015',
          'Muy activo en redes sociales',
          'Prefiere recibir materiales con antelación',
          'Contacto recomendado por otro artista',
          'Trabaja principalmente con artistas emergentes'
        ][Math.floor(Math.random() * 10)] : null;

        contactsToCreate.push({
          name: `${firstName} ${lastName}`,
          email,
          phone,
          company,
          role,
          category: type.category,
          city,
          country: 'España',
          notes,
          created_by: user.id,
          is_public: Math.random() > 0.7, // 30% are public
          field_config: {
            email: true,
            phone: true,
            company: true,
            role: true,
            notes: true,
            stage_name: type.category === 'artista',
            legal_name: type.category === 'legal' || type.category === 'artista'
          }
        });
      }
    }
  }

  // Also create some additional contacts without company (freelancers)
  for (let i = 0; i < 50; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const typeCategory = randomElement(contactTypes);
    const role = randomElement(typeCategory.roles);
    const city = randomElement(cities);
    
    contactsToCreate.push({
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      phone: generatePhone(),
      company: 'Freelance',
      role,
      category: typeCategory.category,
      city,
      country: 'España',
      notes: 'Profesional independiente',
      created_by: user.id,
      is_public: false,
      field_config: {
        email: true,
        phone: true,
        company: false,
        role: true,
        notes: true
      }
    });
  }

  console.log(`📊 Total de contactos a crear: ${contactsToCreate.length}\n`);

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < contactsToCreate.length; i += batchSize) {
    const batch = contactsToCreate.slice(i, i + batchSize);
    const { error } = await supabase
      .from('contacts')
      .insert(batch);

    if (error) {
      console.error(`❌ Error en batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✅ Batch ${i / batchSize + 1} creado (${batch.length} contactos)`);
    }
  }

  // Summary
  const categoryCounts: Record<string, number> = {};
  contactsToCreate.forEach(contact => {
    categoryCounts[contact.category] = (categoryCounts[contact.category] || 0) + 1;
  });

  console.log('\n📈 Resumen por categoría:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} contactos`);
    });

  console.log('\n✨ ¡Contactos generados exitosamente!\n');
}

createContacts().catch(console.error);
