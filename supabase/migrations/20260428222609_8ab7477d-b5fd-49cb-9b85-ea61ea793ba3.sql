-- Enum de niveles de permiso
do $$ begin
  create type public.permission_level as enum ('none','view','edit','manage');
exception when duplicate_object then null; end $$;

-- 1. Catálogo de defaults del sistema
create table if not exists public.functional_role_default_permissions (
  id uuid primary key default gen_random_uuid(),
  role_name text not null,
  module text not null,
  level public.permission_level not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_name, module)
);

create index if not exists idx_frdp_role on public.functional_role_default_permissions(role_name);
create index if not exists idx_frdp_module on public.functional_role_default_permissions(module);
create index if not exists idx_frdp_lookup on public.functional_role_default_permissions(role_name, module);

alter table public.functional_role_default_permissions enable row level security;

drop policy if exists "frdp_select_all_authenticated" on public.functional_role_default_permissions;
create policy "frdp_select_all_authenticated"
  on public.functional_role_default_permissions for select
  to authenticated using (true);

-- 2. Overrides por workspace
create table if not exists public.functional_role_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role_name text not null,
  module text not null,
  level public.permission_level not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, role_name, module)
);

create index if not exists idx_frpo_ws on public.functional_role_permission_overrides(workspace_id);
create index if not exists idx_frpo_lookup on public.functional_role_permission_overrides(workspace_id, role_name, module);

alter table public.functional_role_permission_overrides enable row level security;

drop policy if exists "frpo_select_workspace_members" on public.functional_role_permission_overrides;
create policy "frpo_select_workspace_members"
  on public.functional_role_permission_overrides for select to authenticated
  using (
    exists (
      select 1 from public.workspace_memberships wm
      where wm.workspace_id = functional_role_permission_overrides.workspace_id
        and wm.user_id = auth.uid()
    )
  );

drop policy if exists "frpo_insert_workspace_admins" on public.functional_role_permission_overrides;
create policy "frpo_insert_workspace_admins"
  on public.functional_role_permission_overrides for insert to authenticated
  with check (
    public.user_has_workspace_permission(auth.uid(), workspace_id, 'OWNER'::workspace_role)
    or public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'::workspace_role)
  );

drop policy if exists "frpo_update_workspace_admins" on public.functional_role_permission_overrides;
create policy "frpo_update_workspace_admins"
  on public.functional_role_permission_overrides for update to authenticated
  using (
    public.user_has_workspace_permission(auth.uid(), workspace_id, 'OWNER'::workspace_role)
    or public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'::workspace_role)
  )
  with check (
    public.user_has_workspace_permission(auth.uid(), workspace_id, 'OWNER'::workspace_role)
    or public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'::workspace_role)
  );

drop policy if exists "frpo_delete_workspace_admins" on public.functional_role_permission_overrides;
create policy "frpo_delete_workspace_admins"
  on public.functional_role_permission_overrides for delete to authenticated
  using (
    public.user_has_workspace_permission(auth.uid(), workspace_id, 'OWNER'::workspace_role)
    or public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER'::workspace_role)
  );

-- Trigger updated_at para overrides y defaults
create or replace function public.touch_functional_perms_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_frpo_touch on public.functional_role_permission_overrides;
create trigger trg_frpo_touch
  before update on public.functional_role_permission_overrides
  for each row execute function public.touch_functional_perms_updated_at();

drop trigger if exists trg_frdp_touch on public.functional_role_default_permissions;
create trigger trg_frdp_touch
  before update on public.functional_role_default_permissions
  for each row execute function public.touch_functional_perms_updated_at();

-- 3. Función de resolución de permiso efectivo (override > default > none)
-- OWNER y TEAM_MANAGER del workspace siempre devuelven 'manage'.
create or replace function public.get_functional_permission(
  _user_id uuid,
  _workspace_id uuid,
  _module text
)
returns public.permission_level
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ws_role workspace_role;
  v_role_name text;
  v_level public.permission_level;
begin
  if _user_id is null or _workspace_id is null or _module is null then
    return 'none'::public.permission_level;
  end if;

  -- Bypass total para OWNER / TEAM_MANAGER del workspace
  select wm.role into v_ws_role
  from public.workspace_memberships wm
  where wm.user_id = _user_id and wm.workspace_id = _workspace_id
  limit 1;

  if v_ws_role in ('OWNER','TEAM_MANAGER') then
    return 'manage'::public.permission_level;
  end if;

  -- Resolver rol funcional desde el contacto espejo del miembro
  select c.role into v_role_name
  from public.contacts c
  where c.field_config->>'workspace_user_id' = _user_id::text
    and c.field_config->>'mirror_type' = 'workspace_member'
    and c.role is not null
    and length(trim(c.role)) > 0
  limit 1;

  if v_role_name is null then
    return 'none'::public.permission_level;
  end if;

  -- 1) Override del workspace
  select o.level into v_level
  from public.functional_role_permission_overrides o
  where o.workspace_id = _workspace_id
    and o.role_name = v_role_name
    and o.module = _module
  limit 1;

  if v_level is not null then
    return v_level;
  end if;

  -- 2) Default del sistema
  select d.level into v_level
  from public.functional_role_default_permissions d
  where d.role_name = v_role_name
    and d.module = _module
  limit 1;

  if v_level is not null then
    return v_level;
  end if;

  -- 3) Deny by default
  return 'none'::public.permission_level;
end;
$$;

-- Helper booleano para usar cómodamente desde policies
create or replace function public.has_functional_permission(
  _user_id uuid,
  _workspace_id uuid,
  _module text,
  _required public.permission_level
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with hierarchy as (
    select case _required
      when 'none' then 0
      when 'view' then 1
      when 'edit' then 2
      when 'manage' then 3
    end as required_rank
  ),
  granted as (
    select case public.get_functional_permission(_user_id, _workspace_id, _module)
      when 'none' then 0
      when 'view' then 1
      when 'edit' then 2
      when 'manage' then 3
    end as granted_rank
  )
  select granted.granted_rank >= hierarchy.required_rank
  from hierarchy, granted;
$$;

-- 4. Índice de soporte sobre contacts (lookup rápido del rol funcional por user_id)
create index if not exists idx_contacts_workspace_user_id
  on public.contacts ((field_config->>'workspace_user_id'))
  where field_config->>'mirror_type' = 'workspace_member';