-- =============================================
-- Xavier Préstamos — Migración inicial
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLAS
-- =============================================

CREATE TABLE secciones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE empleados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  seccion_id uuid REFERENCES secciones(id) ON DELETE SET NULL,
  telefono text,
  activo boolean DEFAULT true,
  notas text,
  calificacion integer CHECK (calificacion BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE prestamos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  monto_original numeric NOT NULL CHECK (monto_original > 0),
  tasa_mensual numeric NOT NULL CHECK (tasa_mensual BETWEEN 0.03 AND 0.08),
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  cuota_mensual numeric NOT NULL,
  cuota_quincenal numeric NOT NULL,
  estado text DEFAULT 'activo' CHECK (estado IN ('activo', 'completado', 'cancelado')),
  notas text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE cuotas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestamo_id uuid REFERENCES prestamos(id) ON DELETE CASCADE,
  numero_cuota integer NOT NULL CHECK (numero_cuota BETWEEN 1 AND 72),
  fecha_vencimiento date NOT NULL,
  monto_esperado numeric NOT NULL,
  monto_pagado numeric DEFAULT 0,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'parcial', 'vencida')),
  fecha_pago timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE pagos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuota_id uuid REFERENCES cuotas(id) ON DELETE CASCADE,
  prestamo_id uuid REFERENCES prestamos(id) ON DELETE CASCADE,
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  monto numeric NOT NULL CHECK (monto > 0),
  fecha_pago timestamptz DEFAULT now(),
  notas text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX idx_empleados_seccion ON empleados(seccion_id);
CREATE INDEX idx_prestamos_empleado ON prestamos(empleado_id);
CREATE INDEX idx_prestamos_estado ON prestamos(estado);
CREATE INDEX idx_cuotas_prestamo ON cuotas(prestamo_id);
CREATE INDEX idx_cuotas_vencimiento ON cuotas(fecha_vencimiento);
CREATE INDEX idx_cuotas_estado ON cuotas(estado);
CREATE INDEX idx_pagos_prestamo ON pagos(prestamo_id);
CREATE INDEX idx_pagos_empleado ON pagos(empleado_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Solo el usuario autenticado puede leer/escribir
-- =============================================

ALTER TABLE secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Políticas: solo usuarios autenticados
CREATE POLICY "auth_all_secciones" ON secciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_empleados" ON empleados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_prestamos" ON prestamos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_cuotas" ON cuotas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pagos" ON pagos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- DATOS INICIALES (secciones de ejemplo)
-- =============================================

INSERT INTO secciones (nombre, descripcion) VALUES
  ('Cerdos', 'Área de crianza de cerdos'),
  ('Pollos', 'Área de crianza de pollos'),
  ('Fábrica de Alimentos', 'Producción y procesamiento de alimentos'),
  ('Administración', 'Personal administrativo');

-- =============================================
-- FUNCIÓN: marcar cuotas vencidas automáticamente
-- Ejecutar como cron job en Supabase (opcional)
-- =============================================

CREATE OR REPLACE FUNCTION marcar_cuotas_vencidas()
RETURNS void AS $$
  UPDATE cuotas
  SET estado = 'vencida'
  WHERE estado = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;
$$ LANGUAGE sql;
