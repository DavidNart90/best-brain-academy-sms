-- Phase 3 finance core (P3-01 addendum): feeding-fee and admission-fee amounts join the generic,
-- effective-dated fee-component engine as flat-scope components (no class/location tie), consistent
-- with base_class_fee/location_transport_charge. These are NOT invoice line items — feeding/admission
-- receipts (feeding_receipts/admission_receipts) look up the active rate for display/default purposes.

insert into public.fee_components (code, name, scope, is_required, sort_order, status) values
  ('feeding_fee', 'Feeding Fee', 'flat', false, 30, 'active'),
  ('admission_fee', 'Admission Fee', 'flat', false, 40, 'active');

insert into public.fee_component_rates (fee_component_id, academic_year_id, academic_term_id, amount, status)
select
  (select id from public.fee_components where code = 'feeding_fee'),
  (select id from public.academic_years where name = '2026/2027'),
  (select id from public.academic_terms where name = 'Term 1'
    and academic_year_id = (select id from public.academic_years where name = '2026/2027')),
  10.00, 'active';

insert into public.fee_component_rates (fee_component_id, academic_year_id, academic_term_id, amount, status)
select
  (select id from public.fee_components where code = 'admission_fee'),
  (select id from public.academic_years where name = '2026/2027'),
  (select id from public.academic_terms where name = 'Term 1'
    and academic_year_id = (select id from public.academic_years where name = '2026/2027')),
  50.00, 'active';
