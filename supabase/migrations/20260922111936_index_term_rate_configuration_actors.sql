-- Cover audit-actor foreign keys added by the term-rate approval workflow.

create index term_rate_configurations_created_by_idx
  on public.term_rate_configurations (created_by)
  where created_by is not null;

create index term_rate_configurations_updated_by_idx
  on public.term_rate_configurations (updated_by)
  where updated_by is not null;
