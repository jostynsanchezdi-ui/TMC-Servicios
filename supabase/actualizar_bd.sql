-- =============================================
-- TMC Servicios — Actualizaciones de base de datos
-- Ejecutar en Supabase > SQL Editor
-- =============================================

-- 1. Permitir hasta 72 cuotas por préstamo (3 años = 36 meses = 72 cuotas quincenales)
ALTER TABLE cuotas DROP CONSTRAINT IF EXISTS cuotas_numero_cuota_check;
ALTER TABLE cuotas ADD CONSTRAINT cuotas_numero_cuota_check CHECK (numero_cuota BETWEEN 1 AND 72);

-- 2. Agregar calificacion manual (1-5 estrellas) a empleados
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS calificacion integer CHECK (calificacion BETWEEN 1 AND 5);

-- 3. Activar tarea automática para marcar cuotas vencidas cada día
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'marcar-cuotas-vencidas-diario',
  '0 6 * * *',
  'SELECT marcar_cuotas_vencidas()'
);

-- Verificar que quedó activo (opcional)
-- SELECT * FROM cron.job;
