create or replace function public.get_user_functional_role(
  _user_id uuid,
  _workspace_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if _user_id is null or _workspace_id is null then
    return null;
  end if;

  select c.role into v_role
  from public.contacts c
  where c.field_config->>'workspace_user_id' = _user_id::text
    and c.field_config->>'mirror_type' = 'workspace_member'
    and c.role is not null
    and length(trim(c.role)) > 0
  limit 1;

  return v_role;
end;
$$;

grant execute on function public.get_user_functional_role(uuid, uuid) to authenticated, anon;