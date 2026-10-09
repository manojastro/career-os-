ALTER TABLE public.outreach DROP CONSTRAINT IF EXISTS outreach_status_check;
ALTER TABLE public.outreach ADD CONSTRAINT outreach_status_check CHECK (status = ANY (ARRAY['draft','approved','sent_manually','responded','saved','dismissed']));
ALTER TABLE public.outreach
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.outreach ADD CONSTRAINT outreach_response_notes_len CHECK (length(response_notes) <= 5000);

-- A response can only be recorded on an item the owner already sent manually.
CREATE OR REPLACE FUNCTION public.outreach_response_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'responded' AND COALESCE(OLD.status,'') NOT IN ('sent_manually','responded') THEN
    RAISE EXCEPTION 'A response can only be recorded after you sent the message yourself.' USING errcode = '23514';
  END IF;
  IF NEW.status = 'sent_manually' AND NEW.sent_at IS NULL THEN NEW.sent_at := now(); END IF;
  IF NEW.status = 'responded' AND NEW.response_received_at IS NULL THEN NEW.response_received_at := now(); END IF;
  -- agent-supplied source link travels in provenance
  IF NULLIF(NEW.provenance->>'source_url','') IS NOT NULL AND NEW.provenance->>'source_url' ~ '^https?://' THEN
    NEW.source_url := NEW.provenance->>'source_url';
    BEGIN NEW.verified_at := COALESCE((NEW.provenance->>'verified_at')::timestamptz, NEW.verified_at);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER outreach_response_guard BEFORE INSERT OR UPDATE ON public.outreach
  FOR EACH ROW EXECUTE FUNCTION public.outreach_response_guard();
