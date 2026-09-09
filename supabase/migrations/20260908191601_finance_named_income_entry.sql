-- Named miscellaneous income uses the existing description and audit ledger.
-- The category-based RPC remains compatible with older clients.
create or replace function public.record_named_misc_receipt(
  request_key uuid, income_name text, receipt_amount numeric,
  target_business_date date, target_payment_method_id bigint,
  target_payer_name text default null, target_external_reference text default null,
  target_notes text default null
) returns jsonb language plpgsql security invoker set search_path = ''
as $function$
begin
  if char_length(btrim(coalesce(income_name,''))) not between 2 and 500 then
    raise exception using errcode = '22023', message = 'Enter an income name between 2 and 500 characters.';
  end if;
  return public.record_misc_receipt(request_key,request_key::text,null,btrim(income_name),
    receipt_amount,target_business_date,target_payment_method_id,null,target_payer_name,
    target_external_reference,target_notes);
end;
$function$;
revoke all on function public.record_named_misc_receipt(uuid,text,numeric,date,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.record_named_misc_receipt(uuid,text,numeric,date,bigint,text,text,text) to authenticated;
