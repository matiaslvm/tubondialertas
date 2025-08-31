const axios = require('axios');
require('dotenv').config();

/**
 * Servicio para interactuar con la API de TuBondi
 */
class TuBondiService {
  constructor() {
    this.baseURL = process.env.TUBONDI_API_URL || 'https://api.tubondi.com';
    this.timeout = 30000; // 30 segundos
  }

  /**
   * Consulta el endpoint de TuBondi para obtener datos de coches
   * @param {string} endpoint - Endpoint específico a consultar
   * @returns {Promise<Array>} - Array de datos de coches
   */
  async obtenerDatosCoches(endpoint = '/coches') {
    try {
      console.log(`🚌 Consultando TuBondi API: ${this.baseURL}${endpoint}`);
      
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'TuBondi-Alertas/1.0.0',
          'Accept': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const datos = response.data;
      console.log(`📊 Recibidos ${Array.isArray(datos) ? datos.length : 'N/A'} registros de TuBondi`);
      
      return this.procesarDatosTuBondi(datos);
      
    } catch (error) {
      console.error('❌ Error al consultar TuBondi API:', error.message);
      
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ Timeout: La API de TuBondi no respondió en 30 segundos');
      } else if (error.response) {
        console.error(`🔴 Respuesta HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        console.error('🔴 No se pudo conectar a la API de TuBondi');
      }
      
      throw error;
    }
  }

  /**
   * Procesa y normaliza los datos recibidos de TuBondi
   * @param {Object|Array} datosBrutos - Datos raw de la API
   * @returns {Array} - Array de objetos normalizados para Supabase
   */
  procesarDatosTuBondi(datosBrutos) {
    try {
      // Si los datos vienen como objeto con una propiedad que contiene el array
      let coches = Array.isArray(datosBrutos) ? datosBrutos : datosBrutos.coches || datosBrutos.vehicles || [];
      
      if (!Array.isArray(coches)) {
        console.warn('⚠️  Los datos recibidos no son un array, intentando convertir...');
        coches = [datosBrutos];
      }

      const cochesNormalizados = coches.map(coche => {
        // Normalizar los datos según la estructura esperada de TuBondi
        return {
          coche: coche.servicio || coche.id || coche.vehicleId || 'N/A',
          linea: coche.linea || coche.line || coche.route || 'N/A',
          lat: parseFloat(coche.lat || coche.latitude || 0),
          lon: parseFloat(coche.lon || coche.longitude || 0),
          tiempo: coche.tiempo || coche.time || new Date().toISOString(),
          itinerario_fechayhora: this.parsearFechaHora(coche.itinerario_fechayhora || coche.scheduledTime),
          horaTeoricaAjustada: coche.horaTeoricaAjustada || coche.adjustedTime || null
        };
      });

      console.log(`🔄 Procesados ${cochesNormalizados.length} registros`);
      return cochesNormalizados;
      
    } catch (error) {
      console.error('❌ Error al procesar datos de TuBondi:', error.message);
      return [];
    }
  }

  /**
   * Convierte strings de fecha/hora a formato ISO
   * @param {string} fechaHora - Fecha y hora en formato string
   * @returns {string|null} - Fecha en formato ISO o null
   */
  parsearFechaHora(fechaHora) {
    if (!fechaHora) return null;
    
    try {
      const fecha = new Date(fechaHora);
      return fecha.toISOString();
    } catch (error) {
      console.warn(`⚠️  No se pudo parsear fecha: ${fechaHora}`);
      return null;
    }
  }

  /**
   * Valida que los datos del coche sean válidos antes de insertar
   * @param {Object} coche - Objeto con datos del coche
   * @returns {boolean} - true si es válido
   */
  validarDatosCoche(coche) {
    const camposRequeridos = ['coche', 'linea', 'lat', 'lon'];
    
    for (const campo of camposRequeridos) {
      if (!coche[campo] || coche[campo] === 'N/A') {
        console.warn(`⚠️  Coche inválido - falta campo: ${campo}`);
        return false;
      }
    }

    // Validar coordenadas
    if (coche.lat === 0 && coche.lon === 0) {
      console.warn('⚠️  Coche inválido - coordenadas en (0,0)');
      return false;
    }

    return true;
  }
}

module.exports = TuBondiService;