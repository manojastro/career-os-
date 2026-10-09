ALTER TABLE public.career_preferences
  ADD COLUMN IF NOT EXISTS study_minutes integer NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS research_sources text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.career_preferences
  ADD CONSTRAINT career_preferences_study_minutes_check CHECK (study_minutes BETWEEN 30 AND 60);
ALTER TABLE public.career_preferences ALTER COLUMN briefing_time SET DEFAULT '07:00';
ALTER TABLE public.career_preferences ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';
