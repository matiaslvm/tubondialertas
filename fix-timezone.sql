-- Configuración de zona horaria para Argentina/Córdoba
-- Ejecutar en Supabase SQL Editor

-- 1. Configurar zona horaria de la base de datos
SET timezone = 'America/Argentina/Cordoba';

-- 2. Agregar columnas faltantes (con nombres compatibles)
ALTER TABLE coches 
ADD COLUMN IF NOT EXISTS hora_salida TEXT,
ADD COLUMN IF NOT EXISTS hora_teorica TEXT,  -- Sin mayúscula para evitar problemas
ADD COLUMN IF NOT EXISTS distancia_minutos FLOAT8,
ADD COLUMN IF NOT EXISTS ruta_descripcion TEXT,
ADD COLUMN IF NOT EXISTS notificacion TEXT,
ADD COLUMN IF NOT EXISTS dist_parada INTEGER,
ADD COLUMN IF NOT EXISTS parada_codigo TEXT,
ADD COLUMN IF NOT EXISTS parada_descripcion TEXT,
ADD COLUMN IF NOT EXISTS es_gps BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
ADD COLUMN IF NOT EXISTS fecha_consulta DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS hora_consulta TIME DEFAULT CURRENT_TIME;

-- 3. Función para formatear fecha/hora argentina
CREATE OR REPLACE FUNCTION formato_argentino(timestamp_input TIMESTAMPTZ)
RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(timestamp_input AT TIME ZONE 'America/Argentina/Cordoba', 'DD/MM/YYYY HH24:MI:SS');
END;
$$ LANGUAGE plpgsql;

-- 4. Función para obtener fecha actual argentina
CREATE OR REPLACE FUNCTION fecha_argentina()
RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(NOW() AT TIME ZONE 'America/Argentina/Cordoba', 'DD/MM/YYYY');
END;
$$ LANGUAGE plpgsql;

-- 5. Función para obtener hora actual argentina
CREATE OR REPLACE FUNCTION hora_argentina()
RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(NOW() AT TIME ZONE 'America/Argentina/Cordoba', 'HH24:MI:SS');
END;
$$ LANGUAGE plpgsql;

-- 6. Actualizar timestamps existentes a zona horaria argentina
UPDATE coches 
SET 
    fecha_consulta = (created_at AT TIME ZONE 'America/Argentina/Cordoba')::DATE,
    hora_consulta = (created_at AT TIME ZONE 'America/Argentina/Cordoba')::TIME
WHERE fecha_consulta IS NULL OR hora_consulta IS NULL;

-- 7. Crear vista con horarios formateados
CREATE OR REPLACE VIEW vista_coches_argentina AS
SELECT 
    c.id,
    c.coche,
    c.linea,
    c.lat,
    c.lon,
    c.tiempo,
    c.hora_salida,
    c.servicio,
    c.sentido,
    c.ruta,
    c.color,
    c.cliente_id,
    c.cliente_nombre,
    c.parada_codigo,
    c.parada_descripcion,
    c.ruta_descripcion,
    c.notificacion,
    c.es_gps,
    -- Horarios formateados para Argentina
    formato_argentino(c.created_at) as fecha_hora_argentina,
    TO_CHAR(c.created_at AT TIME ZONE 'America/Argentina/Cordoba', 'DD/MM/YYYY') as fecha_argentina,
    TO_CHAR(c.created_at AT TIME ZONE 'America/Argentina/Cordoba', 'HH24:MI:SS') as hora_argentina,
    TO_CHAR(c.created_at AT TIME ZONE 'America/Argentina/Cordoba', 'HH24:MI') as hora_corta,
    c.created_at
FROM coches c
ORDER BY c.created_at DESC;

-- 8. Vista de estadísticas con horarios argentinos
CREATE OR REPLACE VIEW estadisticas_argentina AS
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT coche) as coches_unicos,
    COUNT(DISTINCT linea) as lineas_activas,
    COUNT(DISTINCT cliente_id) as empresas_activas,
    COUNT(CASE WHEN es_gps = true THEN 1 END) as datos_gps,
    COUNT(CASE WHEN es_gps = false OR es_gps IS NULL THEN 1 END) as datos_diagrama,
    formato_argentino(MAX(created_at)) as ultima_actualizacion_argentina,
    TO_CHAR(MAX(created_at) AT TIME ZONE 'America/Argentina/Cordoba', 'DD/MM/YYYY HH24:MI') as ultima_actualizacion_corta
FROM coches
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 9. Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_coches_fecha_consulta ON coches(fecha_consulta);
CREATE INDEX IF NOT EXISTS idx_coches_hora_consulta ON coches(hora_consulta);
CREATE INDEX IF NOT EXISTS idx_coches_hora_salida ON coches(hora_salida);
CREATE INDEX IF NOT EXISTS idx_coches_parada_codigo ON coches(parada_codigo);

-- 10. Trigger para actualizar automáticamente fecha y hora argentina
CREATE OR REPLACE FUNCTION actualizar_fecha_hora_argentina()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_consulta = (NEW.created_at AT TIME ZONE 'America/Argentina/Cordoba')::DATE;
    NEW.hora_consulta = (NEW.created_at AT TIME ZONE 'America/Argentina/Cordoba')::TIME;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fecha_hora_argentina
    BEFORE INSERT OR UPDATE ON coches
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_hora_argentina();

-- Test de las funciones
SELECT 
    'Configuración de zona horaria completada' as resultado,
    fecha_argentina() as fecha_actual,
    hora_argentina() as hora_actual,
    formato_argentino(NOW()) as fecha_hora_completa;
