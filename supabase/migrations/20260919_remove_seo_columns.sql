-- Shrika Dreams: remove SEO fields from Admin-managed content tables.
-- SEO is managed separately; this migration removes only the confirmed SEO columns.

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS seo_keywords,
  DROP COLUMN IF EXISTS og_image_url,
  DROP COLUMN IF EXISTS canonical_url;

ALTER TABLE public.localities
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS seo_keywords,
  DROP COLUMN IF EXISTS og_image_url,
  DROP COLUMN IF EXISTS canonical_url;

ALTER TABLE public.builders
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS seo_keywords,
  DROP COLUMN IF EXISTS og_image_url,
  DROP COLUMN IF EXISTS canonical_url;
