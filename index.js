require('dotenv').config();
const cron = require('node-cron');
const TuBondiService = require('./services/tubondiService');
const { insertarCoches, cocheExiste, obtenerEstadisticas } = require('./config/supabase');

// Instancia del servicio de TuBondi
const tubondiService = new TuBondiService();

/**
 * Función principal que consulta TuBondi y guarda en Supabase
 */
async function consultarYGuardarDatos() {
  const timestamp = new Date().toLocaleString('es-AR');
  console.log(`\n🕐 [${timestamp}] Iniciando consulta a TuBondi...`);
  
  try {
    // 1. Consultar la API de TuBondi
    const datosCoches = await tubondiService.obtenerDatosCoches();
    
    if (!datosCoches || datosCoches.length === 0) {
      console.log('ℹ️  No se recibieron datos de TuBondi');
      return;
    }

    // 2. Filtrar coches válidos y evitar duplicados
    const cochesValidos = [];
    
    for (const coche of datosCoches) {
      // Validar datos
      if (!tubondiService.validarDatosCoche(coche)) {
        continue;
      }

      // Verificar duplicados (últimos 5 minutos)
      const existe = await cocheExiste(coche.coche);
      if (existe) {
        console.log(`⏭️  Saltando coche duplicado: ${coche.coche}`);
        continue;
      }

      cochesValidos.push(coche);
    }

    // 3. Insertar en Supabase si hay datos válidos
    if (cochesValidos.length > 0) {
      const resultado = await insertarCoches(cochesValidos);
      
      if (resultado.success) {
        console.log(`✅ Proceso completado: ${resultado.count} coches guardados`);
        
        // Mostrar estadísticas
        const stats = await obtenerEstadisticas();
        console.log(`📊 Total de registros en BD: ${stats.total}`);
      } else {
        console.error(`❌ Error al guardar: ${resultado.error}`);
      }
    } else {
      console.log('ℹ️  No hay coches nuevos para guardar');
    }

  } catch (error) {
    console.error('❌ Error en consultarYGuardarDatos:', error.message);
    
    // Log adicional para debugging
    if (error.response) {
      console.error('📄 Detalles del error HTTP:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url
      });
    }
  }
}

/**
 * Función de inicialización del sistema
 */
async function inicializar() {
  console.log('🚀 Iniciando TuBondi Alertas...');
  console.log('📋 Configuración:');
  console.log(`   - Supabase URL: ${process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   - Supabase Key: ${process.env.SUPABASE_KEY ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`   - TuBondi API: ${process.env.TUBONDI_API_URL || 'Usando URL por defecto'}`);
  
  // Verificar conexión con Supabase
  try {
    const stats = await obtenerEstadisticas();
    console.log(`✅ Conexión con Supabase exitosa - Total registros: ${stats.total}`);
  } catch (error) {
    console.error('❌ Error al conectar con Supabase:', error.message);
    console.error('🔧 Verifica tu configuración en el archivo .env');
    return;
  }

  // Ejecutar una consulta inicial
  console.log('🔄 Ejecutando consulta inicial...');
  await consultarYGuardarDatos();

  // Configurar cronjob para ejecutar cada 2 minutos
  const cronSchedule = process.env.CRON_SCHEDULE || '*/2 * * * *';
  console.log(`⏰ Configurando cronjob: ${cronSchedule} (cada 2 minutos)`);
  
  cron.schedule(cronSchedule, async () => {
    await consultarYGuardarDatos();
  }, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
  });

  console.log('✅ Sistema iniciado correctamente');
  console.log('📱 Preparado para futura integración con WhatsApp');
  console.log('🔄 El sistema consultará TuBondi cada 2 minutos...');
}

/**
 * Manejo de señales para cierre graceful
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal de interrupción (CTRL+C)');
  console.log('👋 Cerrando TuBondi Alertas...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal de terminación');
  console.log('👋 Cerrando TuBondi Alertas...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

// Iniciar la aplicación
if (require.main === module) {
  inicializar().catch(error => {
    console.error('❌ Error fatal al inicializar:', error.message);
    process.exit(1);
  });
}

module.exports = {
  consultarYGuardarDatos,
  inicializar
};