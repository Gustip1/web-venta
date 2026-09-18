-- Migration: agrega scroll_depth a analytics_visits
-- (existía solo en analytics_pageviews; el endpoint de exit y el dashboard
-- ya intentaban leer/escribir esta columna en analytics_visits sin que existiera)

ALTER TABLE public.analytics_visits ADD COLUMN IF NOT EXISTS scroll_depth int DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_visits_scroll_depth ON public.analytics_visits(scroll_depth);
