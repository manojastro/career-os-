ALTER TABLE public.recommendations DROP CONSTRAINT IF EXISTS recommendations_kind_check;
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_kind_check CHECK (kind = ANY (ARRAY['top_priority','briefing','action','insight','interview']));

ALTER TABLE public.interview_questions
  ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL;
ALTER TABLE public.interview_practice
  ADD COLUMN IF NOT EXISTS answer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weaknesses text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL;
ALTER TABLE public.interview_practice ADD CONSTRAINT interview_practice_answer_len CHECK (length(answer) <= 20000 AND length(weaknesses) <= 5000);

CREATE INDEX IF NOT EXISTS interview_questions_rec_idx ON public.interview_questions(recommendation_id);
CREATE INDEX IF NOT EXISTS interview_practice_rec_idx ON public.interview_practice(recommendation_id);

CREATE TRIGGER interview_questions_recommendation_owner BEFORE INSERT OR UPDATE OF recommendation_id ON public.interview_questions
  FOR EACH ROW EXECUTE FUNCTION public.require_owned_link('recommendation_id', 'recommendations');
CREATE TRIGGER interview_practice_recommendation_owner BEFORE INSERT OR UPDATE OF recommendation_id ON public.interview_practice
  FOR EACH ROW EXECUTE FUNCTION public.require_owned_link('recommendation_id', 'recommendations');
