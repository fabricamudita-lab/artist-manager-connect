import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const companies: Record<string, string[]> = {
      prensa: [
        'El País', 'Rockdelux', 'Mondosonoro', 'Jenesaispop', 'El Periódico', 'La Vanguardia',
        'ABC Cultural', 'Rolling Stone España', 'Ruta 66', 'PlayGround', 'Vice España',
        'Cadena SER', 'RNE Radio 3', 'Los 40', 'Europa FM', 'Kiss FM', 'Onda Cero',
        'Catalunya Ràdio', 'RAC1', 'iCat', 'TimeOut', 'GQ España', 'Vanity Fair'
      ],
      ar_label: [
        'Universal Music Spain', 'Sony Music Spain', 'Warner Music Spain',
        'BMG Spain', 'The Orchard', 'PIAS Iberia', 'Ernie Records', 'Mushroom Pillow',
        'La Castanya', 'Subterfuge Records', 'Foehn Records', 'Propaganda pel Fet'
      ],
      distribuidor: [
        'Altafonte', 'The Orchard España', 'Believe Digital', 'Ditto Music',
        'DistroKid España', 'CD Baby', 'Idol', 'Kartel Music Group', 'Popstock'
      ],
      promotor: [
        'Primavera Sound', 'FIB', 'Mad Cool', 'Sónar', 'BBK Live', 'Arenal Sound',
        'Vida Festival', 'O Son do Camiño', 'Cruïlla', 'Cap Roig Festival',
        'Sala Apolo', 'Razzmatazz', 'WiZink Center', 'Palau Sant Jordi', 'IFEMA'
      ],
      management: [
        'The Music Republic', 'Tiempo Libre Management', 'Bankrobber',
        'La Factoría del Ritmo', 'Producciones Doradas', 'Snap! Management',
        'Wild Management', 'One Eyed Jacks', 'Música Global Management'
      ],
      booking: [
        'Live Nation España', 'The Music Republic Concerts', 'Producciones Doradas Live',
        'Doctor Music', 'Last Tour International', 'Madness Live', 'Groove Concerts'
      ],
      marketing: [
        'Believe Digital Marketing', 'Virgin Music Spain', 'Altafonte Marketing',
        'Propaganda pel Fet Media', 'Snap! Digital', 'The Music Republic Digital'
      ],
      legal: [
        'Gradiant Abogados', 'Aznar & Muñoz Legal', 'LexMusic',
        'Mariscal & Abogados', 'Suñol Entretenimiento Legal'
      ],
      productor: [
        'El Callejón Estudio', 'Reno Estudio', 'Snap! Studios', 'Música Global Studios',
        'Audiomatic', 'Estudios Uno', 'Red Led Studios', 'The Family'
      ],
      artista: ['Artista Independiente', 'Colectivo Musical', 'Banda'],
      fotografia: [
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
      'Gijón', 'Granada', 'Elche', 'Oviedo', 'Badalona', 'San Sebastián'
    ];

    const contactTypes = [
      {
        category: 'prensa',
        roles: ['Periodista Musical', 'Director/a de Contenidos', 'Redactor/a Jefe', 'Colaborador/a',
          'Editor/a Cultural', 'Crítico/a Musical', 'Locutor/a Radio', 'Productor/a Radio']
      },
      {
        category: 'ar_label',
        roles: ['A&R Director', 'A&R Manager', 'Label Manager', 'Product Manager', 'Talent Scout']
      },
      {
        category: 'distribuidor',
        roles: ['Distribution Manager', 'Digital Distribution', 'Account Manager']
      },
      {
        category: 'promotor',
        roles: ['Promotor/a', 'Booker', 'Festival Director', 'Venue Manager', 'Production Manager']
      },
      {
        category: 'management',
        roles: ['Manager', 'Artist Manager', 'Tour Manager', 'Business Manager']
      },
      {
        category: 'booking',
        roles: ['Booking Agent', 'International Booking', 'Festival Booking']
      },
      {
        category: 'marketing',
        roles: ['Marketing Manager', 'Digital Marketing', 'Social Media Manager', 'PR Manager']
      },
      {
        category: 'legal',
        roles: ['Abogado/a de Entretenimiento', 'Abogado/a Musical', 'Legal Advisor']
      },
      {
        category: 'productor',
        roles: ['Productor Musical', 'Ingeniero de Sonido', 'Mixing Engineer', 'Beat Maker']
      },
      {
        category: 'artista',
        roles: ['Cantante', 'Músico/a', 'DJ', 'Productor/a y Artista']
      },
      {
        category: 'fotografia',
        roles: ['Fotógrafo/a Musical', 'Fotógrafo/a de Conciertos', 'Fotógrafo/a de Prensa']
      },
      {
        category: 'video',
        roles: ['Director/a de Videoclips', 'Director/a de Fotografía', 'Editor/a de Video']
      }
    ];

    const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const generateEmail = (firstName: string, lastName: string, company: string): string => {
      const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
      const cleanCompany = clean(company);
      const cleanFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cleanLast = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return `${cleanFirst}.${cleanLast}@${cleanCompany}.com`;
    };

    const generatePhone = (): string => {
      const prefix = random(['6', '7']);
      const number = Math.floor(10000000 + Math.random() * 90000000);
      return `+34 ${prefix}${number}`;
    };

    // Get authenticated user from request
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const contactsToCreate: any[] = [];

    // Generate contacts
    for (const type of contactTypes) {
      const companyList = companies[type.category] || ['Freelance'];
      const contactsPerCompany = type.category === 'prensa' ? 3 :
        type.category === 'ar_label' ? 4 :
          type.category === 'artista' ? 5 : 2;

      for (const company of companyList) {
        for (let i = 0; i < contactsPerCompany; i++) {
          const firstName = random(firstNames);
          const lastName = random(lastNames);
          const role = random(type.roles);
          const city = random(cities);

          contactsToCreate.push({
            name: `${firstName} ${lastName}`,
            email: generateEmail(firstName, lastName, company),
            phone: Math.random() > 0.3 ? generatePhone() : null,
            company,
            role,
            category: type.category,
            city,
            country: 'España',
            notes: Math.random() > 0.7 ? random([
              'Contacto muy receptivo',
              'Preferible email',
              'Interesado en indie',
              'Especializado en urbana',
              'Contacto desde 2015'
            ]) : null,
            created_by: user.id,
            is_public: Math.random() > 0.7
          });
        }
      }
    }

    // Add freelancers
    for (let i = 0; i < 50; i++) {
      const firstName = random(firstNames);
      const lastName = random(lastNames);
      const typeCategory = random(contactTypes);
      const role = random(typeCategory.roles);
      
      contactsToCreate.push({
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        phone: generatePhone(),
        company: 'Freelance',
        role,
        category: typeCategory.category,
        city: random(cities),
        country: 'España',
        created_by: user.id,
        is_public: false
      });
    }

    // Insert in batches
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < contactsToCreate.length; i += batchSize) {
      const batch = contactsToCreate.slice(i, i + batchSize);
      const { error } = await supabase.from('contacts').insert(batch);

      if (error) {
        console.error(`Error en batch ${i / batchSize + 1}:`, error);
      } else {
        totalInserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: totalInserted,
        message: `Se crearon ${totalInserted} contactos de prueba`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
