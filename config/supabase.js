const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración del cliente de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_KEY deben estar configurados en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Inserta datos de coches en la tabla de Supabase
 * @param {Array} cochesData - Array de objetos con datos de coches
 * @returns {Promise<Object>} - Resultado de la inserción
 */
async function insertarCoches(cochesData) {
  try {
    console.log(`📝 Intentando insertar ${cochesData.length} registros en Supabase...`);
    
    const { data, error } = await supabase
      .from('coches')
      .insert(cochesData)
      .select();

    if (error) {
      console.error('❌ Error al insertar en Supabase:', error);
      throw error;
    }

    console.log(`✅ Se insertaron ${data.length} registros exitosamente`);
    return { success: true, data, count: data.length };
    
  } catch (error) {
    console.error('❌ Error en insertarCoches:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica si un coche ya existe en la base de datos
 * @param {string} servicio - ID del servicio/coche
 * @returns {Promise<boolean>} - true si existe, false si no
 */
async function cocheExiste(servicio) {
  try {
    const { data, error } = await supabase
      .from('coches')
      .select('id')
      .eq('coche', servicio)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // últimos 5 minutos
      .limit(1);

    if (error) {
      console.error('❌ Error al verificar existencia:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('❌ Error en cocheExiste:', error.message);
    return false;
  }
}

/**
 * Obtiene estadísticas de la tabla coches
 * @returns {Promise<Object>} - Estadísticas básicas
 */
async function obtenerEstadisticas() {
  try {
    const { count, error } = await supabase
      .from('coches')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      return { total: 0 };
    }

    return { total: count };
  } catch (error) {
    console.error('❌ Error en obtenerEstadisticas:', error.message);
    return { total: 0 };
  }
}

module.exports = {
  supabase,
  insertarCoches,
  cocheExiste,
  obtenerEstadisticas
};
