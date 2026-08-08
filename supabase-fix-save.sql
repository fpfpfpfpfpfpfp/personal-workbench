create or replace function public.save_workbench_state(secret text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if encode(extensions.digest(convert_to(secret, 'UTF8'), 'sha256'), 'hex') <> '8d23cf6c86e834a7aa6eded54c26ce2bb2e74903538c61bdd5d2197997ab2f72' then
    raise exception 'Invalid editor password';
  end if;

  insert into public.workbench_state (id, data, updated_at)
  values ('main', payload, now())
  on conflict (id) do update
  set data = excluded.data, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_workbench_state(text, jsonb) from public;
grant execute on function public.save_workbench_state(text, jsonb) to anon, authenticated;
