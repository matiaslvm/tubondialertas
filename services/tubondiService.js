const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

/**
 * Servicio para interactuar con la API de TuBondi
 */
class TuBondiService {
  constructor() {
    this.baseURL = process.env.TUBONDI_API_URL || 'https://micronauta4.dnsalias.net/usuario/urbano2_cmd.php';
    this.timeout = 45000; // 45 segundos - más tiempo
    this.maxRetries = 3; // 3 intentos
    this.cache = new Map(); // Cache simple
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutos
  }

  /**
   * Obtiene una nueva sesión de TuBondi
   */
  async obtenerNuevaSesion() {
    try {
      console.log('🔑 Obteniendo nueva sesión de TuBondi...');
      
      const response = await axios.get('https://micronauta4.dnsalias.net/', {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      // Extraer cookies de la respuesta
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        const cookies = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('✅ Nueva sesión obtenida');
        return cookies;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo nueva sesión:', error.message);
      return null;
    }
  }

  /**
   * Consulta el endpoint de TuBondi para obtener datos de coches
   * @param {string} ruta - Número de ruta a consultar (opcional)
   * @returns {Promise<Array>} - Array de datos de coches
   */
  async obtenerDatosCoches(ruta = '60') {
    // ESTRATEGIA HÍBRIDA: proximos_arribos primero, consultacocheporruta como backup
    console.log(`🔄 Estrategia híbrida para ruta ${ruta}`);
    
    try {
      // Intentar proximos_arribos primero (más rápido y confiable)
      console.log('⚡ Intentando proximos_arribos (método rápido)...');
      const datosProximos = await this.obtenerProximosArribos();
      
      if (datosProximos && datosProximos.length > 0) {
        console.log('✅ Datos obtenidos con proximos_arribos');
        return datosProximos;
      }
    } catch (error) {
      console.log('⚠️ proximos_arribos falló, intentando método tradicional...');
    }
    
    // Fallback: método tradicional (consultacocheporruta)
    return await this.obtenerDatosCochesTradicional(ruta);
  }

  /**
   * Método tradicional con consultacocheporruta
   */
  async obtenerDatosCochesTradicional(ruta = '60') {
    const cacheKey = `datos_${ruta}`;
    
    // Verificar cache primero
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const ahora = Date.now();
      
      if (ahora - cached.timestamp < this.cacheTimeout) {
        console.log(`💾 Usando datos del cache para ruta ${ruta} (${Math.round((ahora - cached.timestamp) / 1000)}s antiguos)`);
        return cached.data;
      } else {
        console.log('🗑️ Cache expirado, eliminando...');
        this.cache.delete(cacheKey);
      }
    }
    
    let lastError = null;
    let mejorRespuesta = null;
    
    for (let intento = 1; intento <= this.maxRetries; intento++) {
      try {
        console.log(`🚌 Intento ${intento}/${this.maxRetries} - Consultando TuBondi API (ruta ${ruta})...`);
        
        // Estrategia progresiva
        let response;
        
        if (intento === 1) {
          // Intento 1: Rápido y directo
          response = await this.consultaRapida(ruta);
        } else if (intento === 2) {
          // Intento 2: Con más tiempo
          response = await this.consultaConSesion(ruta);
        } else {
          // Intento 3: Último recurso con timeout extendido
          response = await this.consultaUltimoRecurso(ruta);
        }

        const datos = response.data;
        console.log(`📊 Recibidos datos de TuBondi (tipo: ${typeof datos}, tamaño: ${JSON.stringify(datos).length})`);
        
        // Procesar datos
        const datosProcessados = this.procesarDatosTuBondi(datos);
        
        // Guardar en cache solo si tenemos datos válidos
        if (datosProcessados && datosProcessados.length > 0) {
          this.cache.set(cacheKey, {
            data: datosProcessados,
            timestamp: Date.now()
          });
          console.log(`💾 Datos guardados en cache para ruta ${ruta}`);
        }
        
        return datosProcessados;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Intento ${intento} falló:`, error.message);
        
        // Si es un 408, pero obtuvimos algo de datos, guardarlo como respuesta parcial
        if (error.response && error.response.status === 408) {
          console.error('⏰ Timeout del servidor - la consulta es muy lenta');
          
          // Si tenemos cache viejo, mejor usarlo
          if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            console.log('💾 Usando cache viejo debido a timeout...');
            return cached.data;
          }
        }
        
        if (error.code === 'ECONNABORTED') {
          console.error(`⏰ Timeout del cliente en intento ${intento}: ${this.timeout/1000}s`);
        }
        
        // Si no es el último intento, esperar antes de reintentar
        if (intento < this.maxRetries) {
          const espera = intento * 2000; // 2s, 4s
          console.log(`⏳ Esperando ${espera/1000}s antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, espera));
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    console.error(`❌ Todos los intentos (${this.maxRetries}) fallaron para ruta ${ruta}`);
    
    // Como último recurso, verificar si hay cache muy viejo
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log('💾 Usando cache muy viejo como último recurso...');
      return cached.data;
    }
    
    throw lastError;
  }

  /**
   * Obtiene datos usando proximos_arribos (método rápido)
   */
  async obtenerProximosArribos(codigoParada = 'LC08') {
    console.log(`⚡ Obteniendo próximos arribos para parada ${codigoParada}...`);
    
    try {
      // Obtener cookies frescas
      const cookies = await this.obtenerNuevaSesion();
      
      const config = {
        timeout: 10000, // Solo 10 segundos
        headers: {
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7,es-419;q=0.6',
          'Connection': 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'micronauta4.dnsalias.net',
          'Origin': 'https://micronauta4.dnsalias.net',
          'Referer': 'https://micronauta4.dnsalias.net/',
          'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          'Sec-Ch-Ua-Mobile': '?1',
          'Sec-Ch-Ua-Platform': '"Android"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
        }
      };

      if (cookies) {
        config.headers['Cookie'] = cookies;
      }

      const postData = new URLSearchParams({
        cmd: 'proximos_arribos',
        codigo: codigoParada,
        conf: 'cbaciudad',
        show80min: false
      }).toString();

      console.log(`📦 Payload proximos_arribos: ${postData}`);

      const response = await axios.post(this.baseURL, postData, config);
      
      console.log(`📊 Respuesta proximos_arribos: ${response.status}`);
      
      if (response.data && response.data.proximos_arribos) {
        return this.procesarProximosArribos(response.data);
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Error en obtenerProximosArribos:', error.message);
      throw error;
    }
  }

  /**
   * Convierte hora (HH:MM:SS o HH:MM) a timestamp completo
   */
  convertirHoraATimestamp(hora) {
    if (!hora || typeof hora !== 'string') {
      return null;
    }
    
    try {
      // Si ya es un timestamp completo, devolverlo
      if (hora.includes('-') || hora.includes('/')) {
        return hora;
      }
      
      // Si es solo hora (HH:MM:SS o HH:MM), agregar fecha actual
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Asegurar formato HH:MM:SS
      const horaCompleta = hora.length === 5 ? `${hora}:00` : hora;
      
      return `${fechaHoy} ${horaCompleta}`;
      
    } catch (error) {
      console.log(`⚠️ Error convirtiendo hora ${hora}:`, error.message);
      return null;
    }
  }

  /**
   * Procesa datos de proximos_arribos
   */
  procesarProximosArribos(datos) {
    try {
      console.log('🔄 Procesando datos de proximos_arribos...');
      
      if (!datos.proximos_arribos || datos.proximos_arribos.length === 0) {
        return [];
      }
      
      const arribos = datos.proximos_arribos;
      console.log(`📋 Procesando ${arribos.length} próximos arribos`);
      
      const cochesNormalizados = arribos.map((arribo, index) => {
        console.log(`🚍 Procesando arribo ${index + 1}:`, {
          coche: arribo.coche,
          linea: arribo.linea_nombre,
          tiempo: arribo.proximo || arribo.demora,
          hora_salida: arribo.hora_salida
        });

        return {
          // Campos estándar
          coche: arribo.coche || 'N/A',
          linea: arribo.linea_nombre || arribo.linea,
          lat: arribo.a ? arribo.a[0] : 0,
          lon: arribo.a ? arribo.a[1] : 0,
          tiempo: arribo.proximo || arribo.demora || null,
          
          // Campos específicos de proximos_arribos
          servicio: arribo.serie || null,
          sentido: arribo.sentido || null,
          ruta: arribo.ruta || null,
          color: arribo.color || null,
          cliente_id: arribo.cliente || null,
          
          // Datos de tiempo - convertir horas a timestamps completos
          hora_salida: this.convertirHoraATimestamp(arribo.hora_salida) || null,
          horaTeoricaAjustada: this.convertirHoraATimestamp(arribo.horaTeoricaAjustada) || null,
          hora_teorica: this.convertirHoraATimestamp(arribo.horaTeorica) || null,
          distancia_minutos: arribo.distancia || null,
          
          // Datos adicionales
          rampa: arribo.rampa || null,
          pantalla: arribo.pantalla || null,
          ruta_descripcion: arribo.ruta_descripcion || null,
          notificacion: arribo.notificacion || null,
          dist_parada: arribo.dist_parada || null,
          
          // Metadatos
          parada_codigo: datos.parada?.codigo || null,
          parada_descripcion: datos.parada?.descripcion || null,
          es_gps: parseInt(arribo.coche) > 0,
          cliente_nombre: arribo.cliente_nombre || null
        };
      });

      console.log(`✅ Procesados ${cochesNormalizados.length} arribos exitosamente`);
      return cochesNormalizados;
      
    } catch (error) {
      console.error('❌ Error procesando proximos_arribos:', error.message);
      return [];
    }
  }

  /**
   * Consulta rápida - flujo completo de TuBondi (3 pasos)
   */
  async consultaRapida(ruta) {
    console.log('⚡ Método rápido - Flujo completo TuBondi (3 pasos)');
    
    // Obtener cookies frescas primero
    const cookies = await this.obtenerNuevaSesion();
    
    const config = {
      timeout: 10000, // 10 segundos por request (más rápido)
      headers: {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7,es-419;q=0.6',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'micronauta4.dnsalias.net',
        'Origin': 'https://micronauta4.dnsalias.net',
        'Referer': 'https://micronauta4.dnsalias.net/',
        'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
      }
    };

    if (cookies) {
      config.headers['Cookie'] = cookies;
      console.log('🍪 Usando cookies frescas');
    }

    // PASO 1: Obtener líneas y rutas disponibles
    console.log('1️⃣ Obteniendo líneas disponibles...');
    const lineasData = `cmd=lineasyrutas&conf=&cbaciudad=`;
    console.log(`📦 Payload líneas: ${lineasData}`);
    
    const lineasResponse = await axios.post(
      'https://micronauta4.dnsalias.net/usuario/urbano2_cmd.php?cmd=lineasyrutas',
      lineasData,
      config
    );
    
    console.log('✅ Líneas obtenidas');
    
    // Pequeña pausa para simular comportamiento humano
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mapear línea a ruta_id correcto basado en el JSON
    const mapaLineasRutas = {
      '60': { ruta_id: '56', cliente: 411 }, // Línea 60 sentido V
      '62': { ruta_id: '60', cliente: 411 }, // Línea 62 sentido V  
      '12': { ruta_id: '8', cliente: 411 },  // Línea 12 sentido V
      '30': { ruta_id: '52', cliente: 421 }, // Línea 30 sentido V
      '20': { ruta_id: '6', cliente: 420 },  // Línea 20 sentido V
    };
    
    const rutaInfo = mapaLineasRutas[ruta] || { ruta_id: ruta, cliente: 411 };
    console.log(`🎯 Usando ruta_id: ${rutaInfo.ruta_id}, cliente: ${rutaInfo.cliente}`);

    // PASO 2: Seleccionar traza para obtener paradas
    console.log('2️⃣ Obteniendo paradas disponibles...');
    const trazaData = `cmd=seleccionatraza&ruta=${rutaInfo.ruta_id}&cliente_id=${rutaInfo.cliente}&conf=&cbaciudad=`;
    console.log(`📦 Payload traza: ${trazaData}`);
    
    const trazaResponse = await axios.post(
      'https://micronauta4.dnsalias.net/usuario/urbano2_cmd.php/?cmd=seleccionatraza',
      trazaData,
      config
    );
    
    console.log('✅ Paradas obtenidas, seleccionando parada...');
    
    // Obtener una parada de la respuesta (usar la primera disponible)
    const trazaInfo = trazaResponse.data;
    let paradaSeleccionada = 'LC08'; // Default
    
    if (trazaInfo.paradas && trazaInfo.paradas.length > 0) {
      // Usar una parada del centro (LC08 si existe, sino la primera)
      const paradaCentro = trazaInfo.paradas.find(p => p.codigo === 'LC08');
      paradaSeleccionada = paradaCentro ? paradaCentro.codigo : trazaInfo.paradas[0].codigo;
      console.log(`🎯 Parada seleccionada: ${paradaSeleccionada} (de ${trazaInfo.paradas.length} disponibles)`);
    }

    // Pequeña pausa para simular comportamiento humano
    await new Promise(resolve => setTimeout(resolve, 1000));

    // PASO 3: Consultar colectivos con la parada seleccionada
    console.log('3️⃣ Consultando colectivos...');
    const cochesData = `cmd=consultacocheporruta&ruta=${rutaInfo.ruta_id}&coche=0&cliente=${rutaInfo.cliente}&parada_seleccionada=${paradaSeleccionada}&conf=&cbaciudad=`;
    console.log(`📦 Payload coches: ${cochesData}`);
    
    return await axios.post(this.baseURL, cochesData, config);
  }

  /**
   * Consulta con sesión completa
   */
  async consultaConSesion(ruta) {
    console.log('🔑 Método con sesión completa (30s timeout)');
    
    // Obtener cookies frescas
    const cookies = await this.obtenerNuevaSesion();
    
    const config = {
      timeout: 30000, // 30 segundos
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Origin': 'https://micronauta4.dnsalias.net',
        'Referer': 'https://micronauta4.dnsalias.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    if (cookies) {
      config.headers['Cookie'] = cookies;
    }

    const postData = new URLSearchParams({
      cmd: 'consultacocheporruta',
      ruta: ruta,
      coche: '0',
      cliente: '411',
      parada_seleccionada: 'LC08',
      conf: '',
      cbaciudad: ''
    }).toString();

    return await axios.post(this.baseURL, postData, config);
  }

  /**
   * Último recurso - timeout muy largo
   */
  async consultaUltimoRecurso(ruta) {
    console.log('🚨 Último recurso (60s timeout)');
    
    const config = {
      timeout: 60000, // 60 segundos - último recurso
      headers: {
        'User-Agent': 'curl/7.68.0', // Simular curl
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
      }
    };

    const postData = `cmd=consultacocheporruta&ruta=${ruta}&coche=0&cliente=411&parada_seleccionada=LC08&conf=&cbaciudad=`;
    
    return await axios.post(this.baseURL, postData, config);
  }

  /**
   * Procesa y normaliza los datos recibidos de TuBondi
   * @param {Object|Array} datosBrutos - Datos raw de la API
   * @returns {Array} - Array de objetos normalizados para Supabase
   */
  procesarDatosTuBondi(datosBrutos) {
    try {
      console.log('🔄 Procesando respuesta de TuBondi...');
      console.log('📊 Estructura recibida:', JSON.stringify(datosBrutos, null, 2));
      
      // Verificar si es la estructura esperada
      if (!datosBrutos || typeof datosBrutos !== 'object') {
        console.warn('⚠️  Respuesta no es un objeto válido');
        return [];
      }

      // Log de notificaciones y errores
      if (datosBrutos.notificacion) {
        console.log(`📢 Notificación: ${datosBrutos.notificacion}`);
      }
      
      if (datosBrutos.error) {
        console.log(`⚠️  Error reportado: ${datosBrutos.error}`);
        if (datosBrutos.error !== null) {
          return [];
        }
      }

      // Obtener array de coches
      let coches = [];
      if (datosBrutos.coches && Array.isArray(datosBrutos.coches)) {
        coches = datosBrutos.coches;
      } else {
        console.warn('⚠️  No se encontró array de coches válido');
        return [];
      }

      console.log(`📋 Procesando ${coches.length} coches de TuBondi`);

      const cochesNormalizados = coches.map((coche, index) => {
        console.log(`🚍 Procesando coche ${index + 1}:`, {
          coche: coche.coche,
          linea: coche.linea,
          ruta: coche.ruta,
          sentido: coche.sentido,
          tiempo: coche.tiempo
        });

        return {
          coche: coche.coche || 'N/A',                    // Número del coche
          linea: coche.linea || 'N/A',                    // Línea del colectivo
          lat: parseFloat(coche.lat || 0),                // Latitud
          lon: parseFloat(coche.lon || 0),                // Longitud
          tiempo: coche.tiempo || null,                   // Tiempo de retraso/adelanto
          itinerario_fechayhora: this.parsearFechaHora(coche.itinerario_fechayhora),
          horaTeoricaAjustada: this.parsearFechaHora(coche.horaTeoricaAjustada),
          // Campos adicionales de la respuesta real
          servicio: coche.servicio || null,              // ID del servicio
          sentido: coche.sentido || null,                // Dirección (V/I)
          ruta: coche.ruta || null,                       // Código de ruta
          itinerario_codigo: coche.itinerario_codigo || null,
          demora_minutos: coche.demora_minutos === 99999 ? null : coche.demora_minutos, // 99999 parece ser "sin datos"
          color: coche.color || null,
          media_vuelta: coche.media_vuelta || null,
          pantalla: coche.pantalla || null,
          rampa: coche.rampa || null,
          serie: coche.serie || null
        };
      });

      console.log(`✅ Procesados ${cochesNormalizados.length} registros exitosamente`);
      return cochesNormalizados;
      
    } catch (error) {
      console.error('❌ Error al procesar datos de TuBondi:', error.message);
      console.error('📄 Datos recibidos:', datosBrutos);
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
      // Si ya es un timestamp completo
      if (fechaHora.includes('-') || fechaHora.includes('/')) {
        const fecha = new Date(fechaHora);
        return fecha.toISOString();
      }
      
      // Si es solo hora (HH:MM:SS o HH:MM), usar convertirHoraATimestamp
      const timestampCompleto = this.convertirHoraATimestamp(fechaHora);
      if (timestampCompleto) {
        const fecha = new Date(timestampCompleto);
        return fecha.toISOString();
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️  No se pudo parsear fecha: ${fechaHora}`, error.message);
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

    // Validar coordenadas (TuBondi usa coordenadas negativas para Córdoba)
    if (coche.lat === 0 && coche.lon === 0) {
      console.warn('⚠️  Coche inválido - coordenadas en (0,0)');
      return false;
    }

    // Validar que las coordenadas estén en un rango razonable para Argentina
    if (Math.abs(coche.lat) > 90 || Math.abs(coche.lon) > 180) {
      console.warn(`⚠️  Coche inválido - coordenadas fuera de rango: ${coche.lat}, ${coche.lon}`);
      return false;
    }

    return true;
  }
}

module.exports = TuBondiService;
