-- Script para copiar data de public → staging en Supabase
-- Ejecutar en Supabase SQL Editor DESPUÉS de correr: npm run db:migrate:staging
-- El orden importa por las foreign keys

-- 1. Fasecolda (sin dependencias)
INSERT INTO staging."FasecoldaAbreviatura"
  SELECT * FROM public."FasecoldaAbreviatura"
  ON CONFLICT DO NOTHING;

INSERT INTO staging."FasecoldaCode"
  SELECT * FROM public."FasecoldaCode"
  ON CONFLICT DO NOTHING;

INSERT INTO staging."FasecoldaValue"
  SELECT * FROM public."FasecoldaValue"
  ON CONFLICT DO NOTHING;

-- 2. Listings (sin dependencias)
INSERT INTO staging."Listing"
  SELECT * FROM public."Listing"
  ON CONFLICT DO NOTHING;

-- 3. PriceHistory (depende de Listing)
INSERT INTO staging."PriceHistory"
  SELECT * FROM public."PriceHistory"
  ON CONFLICT DO NOTHING;

-- 4. Alertas y logs (sin dependencias)
INSERT INTO staging."Alert"
  SELECT * FROM public."Alert"
  ON CONFLICT DO NOTHING;

INSERT INTO staging."ScrapeLog"
  SELECT * FROM public."ScrapeLog"
  ON CONFLICT DO NOTHING;

-- Verificar
SELECT 'public' as schema, COUNT(*) as listings FROM public."Listing"
UNION ALL
SELECT 'staging', COUNT(*) FROM staging."Listing";
