-- Reviewed against read-only MCP advisor/catalog evidence.
-- Preserve the existing ensure_rls event trigger and owner execution.
-- On a target without this optional helper, there is nothing to revoke.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
