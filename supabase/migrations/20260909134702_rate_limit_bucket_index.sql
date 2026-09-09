-- Supports policy deletion/maintenance without scanning all per-account counters.
create index request_rate_limits_bucket_idx
on private.request_rate_limits (bucket);
