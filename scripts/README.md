# Development Seeding Scripts

## seed-dev.ts

This script populates the development database with demo data for testing the RBAC system.

### Prerequisites

1. Make sure you have the `SUPABASE_SERVICE_ROLE_KEY` environment variable set:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

2. The service role key can be found in your Supabase dashboard under Settings > API.

### Running the Script

```bash
# Using tsx (recommended)
npx tsx scripts/seed-dev.ts

# Or using node with ts-node
npx ts-node scripts/seed-dev.ts
```

### What it Creates

#### Workspace
- **WORKSPACE DEMO** - A demo workspace for testing

#### Artists
- **Rita Payés** - Cantautora y trombonista catalana
- **Eudald Payés** - Músico y productor  
- **Pol Batlle** - Artista emergente

#### Projects
- **Rita Payés**:
  - "Gira 2025" (TOUR) - Gira nacional de conciertos 2025
  - "Lanzamiento EP" (SINGLE_RELEASE) - Nuevo EP con 4 canciones inéditas
- **Eudald Payés**:
  - "Video Single" (VIDEO) - Videoclip para el próximo single
- **Pol Batlle**:
  - "Campaña PR" (CAMPAIGN) - Campaña de relaciones públicas

#### Demo Users & Roles

| Email | Password | Role | Scope | Description |
|-------|----------|------|-------|-------------|
| owner@demo.com | demo123456 | OWNER | Workspace | Full workspace access |
| team_manager@demo.com | demo123456 | TEAM_MANAGER | Workspace | Workspace management |
| artist_manager@demo.com | demo123456 | ARTIST_MANAGER | Rita Payés | Manages Rita's projects |
| artist_observer@demo.com | demo123456 | ARTIST_OBSERVER | Rita Payés | Read-only Rita access |
| booking_editor@demo.com | demo123456 | EDITOR | "Gira 2025" project | Can edit the tour project |
| marketing_viewer@demo.com | demo123456 | VIEWER | "Campaña PR" project | Read-only PR campaign access |

#### Work Items
- Sample budgets and financial data
- Calendar events for concerts
- Booking offers from venues
- Media interview requests (solicitudes)

### Testing RBAC

After running the script, you can test the authorization system by:

1. Logging in with different demo accounts
2. Trying to access various resources (workspaces, artists, projects)
3. Verifying that permissions are enforced correctly
4. Testing the inheritance model (workspace → artist → project)

### Cleanup

To reset the demo data, you can:

1. Delete the demo users from Supabase Auth dashboard
2. The associated data will be cleaned up by foreign key cascades
3. Or manually delete records from the database tables

### Troubleshooting

- **"SUPABASE_SERVICE_ROLE_KEY not found"**: Make sure the environment variable is set
- **"User already exists"**: The script handles existing users gracefully
- **Permission errors**: Verify your service role key has admin permissions
- **Database errors**: Check that all migrations have been applied successfully