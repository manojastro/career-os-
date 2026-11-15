-- Worker check-in for Agent Activity. Written only by the agent-token poll route (service role);
-- owners read it through the existing agent_owner select policy and cannot write it.
ALTER TABLE public.agent_owner ADD COLUMN IF NOT EXISTS worker_seen_at timestamptz;
