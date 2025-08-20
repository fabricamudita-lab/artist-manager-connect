#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/integrations/supabase/types';

// Initialize Supabase client with service role key for admin operations
const SUPABASE_URL = "https://hptjzbaiclmgbvxlmllo.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Demo users configuration
const demoUsers = [
  {
    email: 'owner@demo.com',
    password: 'demo123456',
    full_name: 'Demo Owner',
    role: 'OWNER' as const,
    scope: 'WORKSPACE' as const
  },
  {
    email: 'team_manager@demo.com', 
    password: 'demo123456',
    full_name: 'Team Manager Demo',
    role: 'TEAM_MANAGER' as const,
    scope: 'WORKSPACE' as const
  },
  {
    email: 'artist_manager@demo.com',
    password: 'demo123456', 
    full_name: 'Artist Manager Demo',
    role: 'ARTIST_MANAGER' as const,
    scope: 'ARTIST' as const,
    artistName: 'Rita Payés'
  },
  {
    email: 'artist_observer@demo.com',
    password: 'demo123456',
    full_name: 'Artist Observer Demo', 
    role: 'ARTIST_OBSERVER' as const,
    scope: 'ARTIST' as const,
    artistName: 'Rita Payés'
  },
  {
    email: 'booking_editor@demo.com',
    password: 'demo123456',
    full_name: 'Booking Editor Demo',
    role: 'EDITOR' as const,
    scope: 'PROJECT' as const,
    projectName: 'Gira 2025'
  },
  {
    email: 'marketing_viewer@demo.com',
    password: 'demo123456',
    full_name: 'Marketing Viewer Demo',
    role: 'VIEWER' as const,
    scope: 'PROJECT' as const,
    projectName: 'Campaña PR'
  }
];

// Artists configuration
const demoArtists = [
  { name: 'Rita Payés', stage_name: 'Rita Payés', description: 'Cantautora y trombonista catalana' },
  { name: 'Eudald Payés', stage_name: 'Eudald Payés', description: 'Músico y productor' },
  { name: 'Pol Batlle', stage_name: 'Pol Batlle', description: 'Artista emergente' }
];

// Projects configuration
const demoProjects = [
  // Rita Payés projects
  { 
    artistName: 'Rita Payés', 
    name: 'Gira 2025', 
    type: 'TOUR' as const, 
    description: 'Gira nacional de conciertos 2025',
    objective: 'Promocionar el nuevo álbum en vivo'
  },
  { 
    artistName: 'Rita Payés', 
    name: 'Lanzamiento EP', 
    type: 'SINGLE_RELEASE' as const, 
    description: 'Nuevo EP con 4 canciones inéditas',
    objective: 'Establecer presencia en plataformas digitales'
  },
  // Eudald Payés projects  
  { 
    artistName: 'Eudald Payés', 
    name: 'Video Single', 
    type: 'VIDEO' as const, 
    description: 'Videoclip para el próximo single',
    objective: 'Contenido visual para redes sociales'
  },
  // Pol Batlle projects
  { 
    artistName: 'Pol Batlle', 
    name: 'Campaña PR', 
    type: 'CAMPAIGN' as const, 
    description: 'Campaña de relaciones públicas',
    objective: 'Aumentar visibilidad mediática'
  }
];

async function createDemoUsers() {
  console.log('🔑 Creating demo users...');
  const createdUsers = [];

  for (const userData of demoUsers) {
    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      });

      if (authError) {
        console.error(`❌ Error creating auth user ${userData.email}:`, authError.message);
        continue;
      }

      if (!authUser.user) {
        console.error(`❌ No user returned for ${userData.email}`);
        continue;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          email: userData.email,
          full_name: userData.full_name,
          roles: ['artist'], // Default role array
          active_role: 'artist'
        });

      if (profileError) {
        console.error(`❌ Error creating profile for ${userData.email}:`, profileError.message);
        continue;
      }

      createdUsers.push({
        ...userData,
        user_id: authUser.user.id
      });

      console.log(`✅ Created user: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Unexpected error creating user ${userData.email}:`, error);
    }
  }

  return createdUsers;
}

async function createDemoWorkspace(ownerId: string) {
  console.log('🏢 Creating demo workspace...');

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      name: 'WORKSPACE DEMO',
      description: 'Workspace de demostración con datos de prueba',
      created_by: ownerId
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating workspace:', error.message);
    throw error;
  }

  console.log('✅ Created workspace: WORKSPACE DEMO');
  return workspace;
}

async function createDemoArtists(workspaceId: string, creatorId: string) {
  console.log('🎵 Creating demo artists...');
  const createdArtists = [];

  for (const artistData of demoArtists) {
    const { data: artist, error } = await supabase
      .from('artists')
      .insert({
        workspace_id: workspaceId,
        name: artistData.name,
        stage_name: artistData.stage_name,
        description: artistData.description,
        created_by: creatorId,
        metadata: {
          genre: 'Jazz/Folk',
          country: 'Spain'
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating artist ${artistData.name}:`, error.message);
      continue;
    }

    createdArtists.push(artist);
    console.log(`✅ Created artist: ${artistData.name}`);
  }

  return createdArtists;
}

async function createDemoProjects(artists: any[], creatorId: string) {
  console.log('📋 Creating demo projects...');
  const createdProjects = [];

  for (const projectData of demoProjects) {
    const artist = artists.find(a => a.name === projectData.artistName);
    if (!artist) {
      console.error(`❌ Artist not found: ${projectData.artistName}`);
      continue;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        artist_id: artist.id,
        workspace_id: artist.workspace_id,
        name: projectData.name,
        description: projectData.description,
        objective: projectData.objective,
        project_type: projectData.type,
        status: 'en_curso',
        created_by: creatorId,
        start_date: new Date().toISOString().split('T')[0],
        labels: [projectData.type.toLowerCase()]
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating project ${projectData.name}:`, error.message);
      continue;
    }

    createdProjects.push({
      ...project,
      artistName: projectData.artistName
    });
    console.log(`✅ Created project: ${projectData.name} (${artist.name})`);
  }

  return createdProjects;
}

async function assignRoles(users: any[], workspace: any, artists: any[], projects: any[]) {
  console.log('👥 Assigning roles to users...');

  for (const user of users) {
    try {
      if (user.scope === 'WORKSPACE') {
        // Assign workspace role
        const { error } = await supabase
          .from('workspace_memberships')
          .insert({
            workspace_id: workspace.id,
            user_id: user.user_id,
            role: user.role
          });

        if (error) {
          console.error(`❌ Error assigning workspace role to ${user.email}:`, error.message);
        } else {
          console.log(`✅ Assigned ${user.role} role to ${user.email} in workspace`);
        }
      }

      if (user.scope === 'ARTIST' && user.artistName) {
        // Assign artist role
        const artist = artists.find(a => a.name === user.artistName);
        if (artist) {
          const { error } = await supabase
            .from('artist_role_bindings')
            .insert({
              artist_id: artist.id,
              user_id: user.user_id,
              role: user.role
            });

          if (error) {
            console.error(`❌ Error assigning artist role to ${user.email}:`, error.message);
          } else {
            console.log(`✅ Assigned ${user.role} role to ${user.email} for artist ${user.artistName}`);
          }
        }
      }

      if (user.scope === 'PROJECT' && user.projectName) {
        // Assign project role
        const project = projects.find(p => p.name === user.projectName);
        if (project) {
          const { error } = await supabase
            .from('project_role_bindings')
            .insert({
              project_id: project.id,
              user_id: user.user_id,
              role: user.role
            });

          if (error) {
            console.error(`❌ Error assigning project role to ${user.email}:`, error.message);
          } else {
            console.log(`✅ Assigned ${user.role} role to ${user.email} for project ${user.projectName}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Unexpected error assigning roles to ${user.email}:`, error);
    }
  }
}

async function createWorkItems(artists: any[], projects: any[], users: any[]) {
  console.log('📝 Creating work items...');

  const creatorId = users.find(u => u.role === 'OWNER')?.user_id;
  if (!creatorId) return;

  // Create budgets
  const ritaArtist = artists.find(a => a.name === 'Rita Payés');
  const giraProject = projects.find(p => p.name === 'Gira 2025');

  if (ritaArtist && giraProject) {
    const { error: budgetError } = await supabase
      .from('budgets')
      .insert({
        name: 'Presupuesto Gira 2025',
        artist_id: ritaArtist.id,
        project_id: giraProject.id,
        type: 'concierto',
        budget_status: 'borrador',
        show_status: 'confirmado',
        city: 'Barcelona',
        country: 'España',
        venue: 'Palau de la Música',
        fee: 15000,
        capacidad: 800,
        event_date: '2025-03-15',
        event_time: '21:00',
        created_by: creatorId
      });

    if (budgetError) {
      console.error('❌ Error creating budget:', budgetError.message);
    } else {
      console.log('✅ Created budget: Presupuesto Gira 2025');
    }
  }

  // Create events
  if (ritaArtist) {
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        title: 'Concierto Barcelona - Gira 2025',
        description: 'Concierto en el Palau de la Música como parte de la Gira 2025',
        event_type: 'concierto',
        location: 'Palau de la Música, Barcelona',
        start_date: '2025-03-15T21:00:00Z',
        end_date: '2025-03-15T23:00:00Z',
        artist_id: ritaArtist.id,
        created_by: creatorId
      });

    if (eventError) {
      console.error('❌ Error creating event:', eventError.message);
    } else {
      console.log('✅ Created event: Concierto Barcelona');
    }
  }

  // Create solicitudes (requests)
  if (ritaArtist) {
    const { error: solicitudError } = await supabase
      .from('solicitudes')
      .insert({
        tipo: 'entrevista',
        estado: 'pendiente',
        nombre_solicitante: 'Radio Nacional',
        email: 'programacion@radionacional.es',
        telefono: '+34 123 456 789',
        medio: 'Radio Nacional de España',
        nombre_programa: 'Música en vivo',
        informacion_programa: 'Programa semanal de música en directo',
        observaciones: 'Interesados en entrevista sobre el nuevo EP',
        artist_id: ritaArtist.id,
        created_by: creatorId
      });

    if (solicitudError) {
      console.error('❌ Error creating solicitud:', solicitudError.message);
    } else {
      console.log('✅ Created solicitud: Radio Nacional interview');
    }
  }

  // Create booking offers
  const polArtist = artists.find(a => a.name === 'Pol Batlle');
  if (polArtist) {
    const { error: bookingError } = await supabase
      .from('booking_offers')
      .insert({
        artist_id: polArtist.id,
        fecha: '2025-04-20',
        hora: '20:00',
        ciudad: 'Madrid',
        lugar: 'Sala El Sol',
        capacidad: 300,
        oferta: '8000€',
        formato: 'Concierto íntimo',
        estado: 'pendiente',
        contacto: 'booking@elsol.es',
        info_comentarios: 'Fecha flexible, interesados en artistas emergentes',
        created_by: creatorId
      });

    if (bookingError) {
      console.error('❌ Error creating booking offer:', bookingError.message);
    } else {
      console.log('✅ Created booking offer: Sala El Sol');
    }
  }
}

function displayDemoLogins(users: any[]) {
  console.log('\n🎭 DEMO CREDENTIALS');
  console.log('=====================================');
  
  users.forEach(user => {
    let roleDescription = '';
    if (user.scope === 'WORKSPACE') {
      roleDescription = `${user.role} of workspace`;
    } else if (user.scope === 'ARTIST') {
      roleDescription = `${user.role} of ${user.artistName}`;
    } else if (user.scope === 'PROJECT') {
      roleDescription = `${user.role} of "${user.projectName}"`;
    }

    console.log(`📧 ${user.email}`);
    console.log(`🔑 Password: ${user.password}`);
    console.log(`👤 Role: ${roleDescription}`);
    console.log(`📝 Name: ${user.full_name}`);
    console.log('-------------------------------------');
  });

  console.log('\n🚀 Development environment seeded successfully!');
  console.log('💡 You can now log in with any of the demo accounts above.');
  console.log('🎯 Each account has different permissions to test the RBAC system.');
}

async function main() {
  try {
    console.log('🌱 Starting development database seeding...\n');

    // Step 1: Create demo users
    const users = await createDemoUsers();
    if (users.length === 0) {
      throw new Error('No users were created successfully');
    }

    // Step 2: Create workspace
    const ownerId = users.find(u => u.role === 'OWNER')?.user_id;
    if (!ownerId) {
      throw new Error('Owner user not found');
    }
    const workspace = await createDemoWorkspace(ownerId);

    // Step 3: Create artists
    const artists = await createDemoArtists(workspace.id, ownerId);

    // Step 4: Create projects
    const projects = await createDemoProjects(artists, ownerId);

    // Step 5: Assign roles
    await assignRoles(users, workspace, artists, projects);

    // Step 6: Create work items
    await createWorkItems(artists, projects, users);

    // Step 7: Display demo logins
    displayDemoLogins(users);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  main();
}

export { main as seedDevelopment };