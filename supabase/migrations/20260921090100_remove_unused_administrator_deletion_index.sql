-- Deletion history is not listed by created_at in the current application.
-- Keep only the prepared-target uniqueness index and the requested_by FK index.
drop index public.administrator_deletion_requests_created_at_idx;
