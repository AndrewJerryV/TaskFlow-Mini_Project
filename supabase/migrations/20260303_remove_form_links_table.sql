-- Migration to drop the form_links table as it is no longer used.
DROP TABLE IF EXISTS public.form_links CASCADE;
