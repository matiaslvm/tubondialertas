const express = require('express');
require('dotenv').config({ path: '.env.local' });
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración - compatible con tu setup anterior
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID;
const PORT = process.env.PORT || 3000;

console.log('🔧 SERVIDOR WEBHOOK WHATSAPP - INICIANDO...');
console.log('='.repeat(50));
console.log(`Puerto: ${PORT}`);
console.log(`VERIFY_TOKEN configurado: ${VERIFY_TOKEN ? 'SÍ' : 'NO'}`);
console.log(`ACCESS_TOKEN configurado: ${ACCESS_TOKEN ? 'SÍ' : 'NO'}`);
console.log(`PHONE_NUMBER_ID: ${PHONE_NUMBER_ID || 'NO CONFIGURADO'}`);
console.log('='.repeat(50));

// Endpoint principal para webhook de WhatsApp (GET - verificación)
app.get('/api/whatsapp-webhook', (req, res) => {
    console.log('\n🔍 VERIFICACIÓN WEBHOOK RECIBIDA');
    console.log('Timestamp:', new Date().toLocaleString('es-AR'));
    console.log('Query params:', req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('\n📋 Parámetros:');
    console.log(`- Mode: ${mode}`);
    console.log(`- Token recibido: ${token ? '[RECIBIDO - OCULTO POR SEGURIDAD]' : 'NO RECIBIDO'}`);
    console.log(`- Challenge: ${challenge}`);
    
    console.log('\n🔑 Verificación:');
    console.log(`- Token esperado: ${VERIFY_TOKEN ? '[CONFIGURADO - OCULTO POR SEGURIDAD]' : 'NO CONFIGURADO'}`);
    console.log(`- Tokens coinciden: ${token === VERIFY_TOKEN}`);
    console.log(`- Modo correcto: ${mode === 'subscribe'}`);
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('\n✅ WEBHOOK VERIFICADO CORRECTAMENTE');
        console.log(`Enviando challenge: ${challenge}`);
        res.status(200).send(challenge);
    } else {
        console.log('\n❌ ERROR EN VERIFICACIÓN');
        if (mode !== 'subscribe') {
            console.log(`- Modo incorrecto. Esperado: "subscribe", Recibido: "${mode}"`);
        }
        if (token !== VERIFY_TOKEN) {
            console.log('- Token no coincide');
        }
        res.status(403).send('Forbidden');
    }
    console.log('='.repeat(50));
});

// Endpoint para recibir mensajes (POST)
app.post('/api/whatsapp-webhook', async (req, res) => {
    console.log('\n📨 MENSAJE RECIBIDO');
    console.log('Timestamp:', new Date().toLocaleString('es-AR'));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
        try {
            await procesarMensajesWhatsApp(body);
            res.status(200).send('OK');
        } catch (error) {
            console.error('❌ Error procesando mensajes:', error);
            res.status(500).send('Error');
        }
    } else {
        console.log('❌ Objeto no reconocido');
        res.status(404).send('Not Found');
    }
});

// Endpoints alternativos que aparecen en tus logs
app.get('/webhook', (req, res) => {
    console.log('🔄 Redirigiendo /webhook -> /api/whatsapp-webhook');
    const queryString = new URLSearchParams(req.query).toString();
    res.redirect(`/api/whatsapp-webhook?${queryString}`);
});

app.get('/api/webhook', (req, res) => {
    console.log('🔄 Redirigiendo /api/webhook -> /api/whatsapp-webhook');
    const queryString = new URLSearchParams(req.query).toString();
    res.redirect(`/api/whatsapp-webhook?${queryString}`);
});

// Endpoint de diagnóstico
app.get('/', (req, res) => {
    res.json({
        status: '✅ Servidor funcionando',
        timestamp: new Date().toLocaleString('es-AR'),
        port: PORT,
        config: {
            verify_token: VERIFY_TOKEN ? '✅ Configurado' : '❌ Faltante',
            access_token: ACCESS_TOKEN ? '✅ Configurado' : '❌ Faltante',
            phone_number_id: PHONE_NUMBER_ID ? '✅ Configurado' : '❌ Faltante'
        },
        endpoints: {
            webhook: '/api/whatsapp-webhook (GET/POST)',
            health: '/health',
            diagnostics: '/'
        },
        instructions: {
            facebook_url: `https://TU_URL_NGROK.ngrok.io/api/whatsapp-webhook`,
            verify_token_preview: VERIFY_TOKEN ? '[CONFIGURADO - OCULTO POR SEGURIDAD]' : 'NO CONFIGURADO'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    console.log('💚 Health check OK');
    res.json({ 
        status: 'healthy', 
        port: PORT,
        timestamp: new Date().toLocaleString('es-AR')
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n🚀 SERVIDOR INICIADO CORRECTAMENTE');
    console.log('='.repeat(60));
    console.log(`🌐 Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`📱 URL para Facebook: https://TU_URL_NGROK.ngrok.io/api/whatsapp-webhook`);
    console.log(`🔑 Token de verificación: ${VERIFY_TOKEN ? '[CONFIGURADO - OCULTO POR SEGURIDAD]' : 'NO CONFIGURADO'}`);
    console.log('='.repeat(60));
    
    // Mostrar instrucciones
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('1. Ejecuta ngrok: ngrok http 3000');
    console.log('2. Copia la URL HTTPS de ngrok');
    console.log('3. En Facebook Developer Console:');
    console.log('   - URL: https://TU_URL_NGROK.ngrok.io/api/whatsapp-webhook');
    console.log(`   - Token: ${VERIFY_TOKEN ? '[USA TU TOKEN REAL]' : 'CONFIGURA_WHATSAPP_VERIFY_TOKEN'}`);
    
    if (!VERIFY_TOKEN) {
        console.log('\n⚠️  ADVERTENCIA: Configura WHATSAPP_VERIFY_TOKEN en tu .env');
    }
});

// ============================================
// INTEGRACIÓN CON TUBONDI
// ============================================

const TuBondiService = require('./services/tubondiService');
const { obtenerEstadisticas, supabase } = require('./config/supabase');
const { extraerUbicacion } = require('./mapeo-calles');
const axios = require('axios');

const tubondiService = new TuBondiService();

/**
 * Procesa mensajes de WhatsApp e integra con TuBondi
 */
async function procesarMensajesWhatsApp(body) {
    body.entry?.forEach(async (entry) => {
        entry.changes?.forEach(async (change) => {
            if (change.field === 'messages') {
                const messages = change.value.messages;
                if (messages) {
                    for (const message of messages) {
                        await procesarMensajeIndividual(message, change.value);
                    }
                }
            }
        });
    });
}

/**
 * Procesa un mensaje individual de WhatsApp
 */
async function procesarMensajeIndividual(message, messageValue) {
    const from = message.from;
    const messageText = message.text?.body?.toLowerCase() || '';
    const messageType = message.type;
    
    console.log(`📱 Procesando mensaje de ${from}: "${messageText}" (tipo: ${messageType})`);
    console.log('🔍 DEBUG - Objeto message completo:', JSON.stringify(message, null, 2));
    
    // Ignorar mensajes que no sean de texto
    if (messageType !== 'text') {
        console.log('⏭️  Mensaje ignorado - no es texto');
        return;
    }
    
    try {
        console.log('🚀 Iniciando procesamiento de consulta...');
        
        // Detectar intención del mensaje
        const respuesta = await procesarConsultaTuBondi(messageText, from);
        
        console.log('💬 Respuesta generada:', respuesta ? 'SÍ' : 'NO');
        console.log('📝 Longitud de respuesta:', respuesta ? respuesta.length : 0);
        
        // Enviar respuesta al usuario
        if (respuesta) {
            console.log('📤 Intentando enviar respuesta...');
            await enviarMensajeWhatsApp(from, respuesta);
        } else {
            console.log('❌ No se generó respuesta');
        }
        
    } catch (error) {
        console.error(`❌ Error procesando mensaje de ${from}:`, error);
        console.error('Stack trace:', error.stack);
        await enviarMensajeWhatsApp(from, '❌ Disculpa, hubo un error procesando tu consulta. Intenta de nuevo en unos minutos.');
    }
}

/**
 * Procesa consultas relacionadas con TuBondi
 */
async function procesarConsultaTuBondi(texto, from) {
    console.log(`🔍 Analizando consulta: "${texto}"`);
    
    // Palabras clave para detectar consultas de colectivos
    const palabrasColectivo = ['colectivo', 'bondi', 'bus', 'micro', 'linea', 'ruta', 'horario', 'cuando llega', 'donde esta', 'tomar', 'pasa', 'cuanto', 'centro', 'williams'];
    const palabrasEstadisticas = ['estadisticas', 'stats', 'cuantos', 'total', 'datos'];
    const palabrasAyuda = ['ayuda', 'help', 'hola', 'info', 'comandos'];
    
    const esConsultaColectivo = palabrasColectivo.some(palabra => texto.includes(palabra));
    const esConsultaEstadisticas = palabrasEstadisticas.some(palabra => texto.includes(palabra));
    const esConsultaAyuda = palabrasAyuda.some(palabra => texto.includes(palabra));
    
    if (esConsultaAyuda || texto === '/start' || texto === '/help') {
        return generarMensajeAyuda();
    }
    
    if (esConsultaEstadisticas) {
        return await generarEstadisticas();
    }
    
    if (esConsultaColectivo) {
        try {
            // Enviar mensaje de "procesando" primero
            await enviarMensajeWhatsApp(from, '⏳ Consultando datos en tiempo real... Un momento por favor.');
            
            // Luego consultar los datos
            const respuesta = await consultarDatosColectivos(texto);
            return respuesta;
        } catch (error) {
            console.error('❌ Error consultando TuBondi, usando respuesta de fallback:', error.message);
            return generarRespuestaFallback();
        }
    }
    
    // Respuesta por defecto
    return `👋 ¡Hola! Soy el bot de TuBondi Alertas.

🚌 Puedo ayudarte con:
• Consultar horarios de colectivos
• Ver estadísticas del sistema
• Información sobre líneas y rutas

Escribe "ayuda" para ver todos los comandos disponibles.`;
}

/**
 * Genera respuesta de fallback cuando TuBondi no responde
 */
function generarRespuestaFallback() {
    return `🚌 **TuBondi Alertas - Información del Sistema**

⚠️ El servicio de datos en tiempo real está temporalmente no disponible.

📋 **Líneas principales de Córdoba:**
• Línea 60 - Centro/Barrio Jardín
• Línea 12 - Centro/Villa El Libertador  
• Línea 30 - Centro/Argüello
• Línea 31 - Centro/Villa Allende

📍 **Información útil:**
• Frecuencia promedio: 15-20 minutos
• Horario: 5:30 AM - 12:30 AM
• Tarifa: Consultar con TAMSE

🔄 **Intenta de nuevo en unos minutos**
El sistema se actualiza cada 2 minutos automáticamente.

💡 Escribe "ayuda" para ver todos los comandos disponibles.`;
}

/**
 * Genera respuesta informativa específica por ubicación
 */
function generarRespuestaInformativaUbicacion(numeroLinea, ubicacion) {
    console.log(`💡 Generando respuesta informativa para línea ${numeroLinea} en ${ubicacion.ubicacion}`);
    
    const opcionesArgentina = {
        timeZone: 'America/Argentina/Cordoba',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    
    const ahora = new Date();
    const horaActual = ahora.toLocaleString('es-AR', opcionesArgentina);
    
    let respuesta = `⚠️ **No hay datos en tiempo real disponibles**\n\n`;
    
    if (numeroLinea) {
        respuesta += `🚌 **Línea ${numeroLinea}**\n`;
    }
    
    respuesta += `📍 **Ubicación consultada:** ${ubicacion.ubicacion}\n`;
    respuesta += `🎯 **Parada principal:** ${ubicacion.parada_principal}\n`;
    
    if (ubicacion.paradas_alternativas.length > 0) {
        respuesta += `🔄 **Paradas alternativas:** ${ubicacion.paradas_alternativas.join(', ')}\n`;
    }
    
    respuesta += `\n💡 **Sugerencias:**\n`;
    respuesta += `• Intenta nuevamente en unos minutos\n`;
    respuesta += `• Verifica si hay colectivos circulando (${horaActual})\n`;
    
    if (ubicacion.ubicacion !== 'centro') {
        respuesta += `• Prueba consultar desde el centro: "línea ${numeroLinea || '62'} en colon"\n`;
    }
    
    respuesta += `\n🔄 Datos consultados: ${horaActual}`;
    
    return respuesta;
}

/**
 * Genera respuesta informativa cuando no hay datos disponibles
 */
function generarRespuestaInformativa(numeroLinea) {
    const lineasInfo = {
        '60': {
            nombre: 'Línea 60',
            recorrido: 'Centro - Barrio Jardín',
            frecuencia: '15-20 minutos',
            horario: '5:30 AM - 12:30 AM',
            paradas_principales: ['Centro', 'Av. Colón', 'Barrio Jardín']
        },
        '62': {
            nombre: 'Línea 62', 
            recorrido: 'Centro - Villa El Libertador',
            frecuencia: '20-25 minutos',
            horario: '5:30 AM - 12:00 AM',
            paradas_principales: ['Centro', 'Av. Colón', 'Villa El Libertador']
        },
        '12': {
            nombre: 'Línea 12',
            recorrido: 'Centro - Argüello',
            frecuencia: '15-20 minutos', 
            horario: '5:30 AM - 12:30 AM',
            paradas_principales: ['Centro', 'Nueva Córdoba', 'Argüello']
        }
    };

    if (numeroLinea && lineasInfo[numeroLinea]) {
        const info = lineasInfo[numeroLinea];
        return `🚌 **${info.nombre}**

📍 **Recorrido:** ${info.recorrido}
⏰ **Frecuencia:** ${info.frecuencia}
🕐 **Horario:** ${info.horario}

🚏 **Paradas principales:**
${info.paradas_principales.map(p => `• ${p}`).join('\n')}

💡 **Información útil:**
• Los colectivos suelen ser más frecuentes en horarios pico
• Consulta el estado en tiempo real desde la app TuBondi
• Para emergencias: 0800-888-TAMSE

🔄 **Sistema de monitoreo temporalmente no disponible**
Intenta de nuevo en unos minutos para datos en tiempo real.`;
    }

    return `🚌 **TuBondi Alertas - Información General**

📋 **Líneas principales de Córdoba:**
• **Línea 60** - Centro/Barrio Jardín (15-20 min)
• **Línea 62** - Centro/Villa El Libertador (20-25 min)  
• **Línea 12** - Centro/Argüello (15-20 min)
• **Línea 30** - Centro/Villa Allende (20-25 min)

⏰ **Horarios generales:** 5:30 AM - 12:30 AM
💰 **Tarifa:** Consultar con TAMSE
📱 **App oficial:** TuBondi (Android/iOS)

💡 **Para consulta específica:**
Escribe "línea X" (ej: "línea 60")

🔄 **Sistema de monitoreo temporalmente no disponible**
Los datos en tiempo real se restaurarán automáticamente.`;
}

/**
 * Genera mensaje de ayuda
 */
function generarMensajeAyuda() {
    return `🤖 **TuBondi Alertas Bot**

🚌 **Comandos disponibles:**

📍 **Consultas de colectivos:**
• "colectivo línea 60"
• "horario línea X"
• "cuando llega el bondi"
• "ruta 60"

📊 **Estadísticas:**
• "estadísticas"
• "cuántos datos tenemos"

ℹ️ **Información:**
• "ayuda" - Ver este mensaje
• "info" - Información del sistema

💡 **Ejemplos:**
• _"¿Cuándo llega el colectivo de la línea 60?"_
• _"Mostrame las estadísticas"_
• _"Información sobre la ruta 12"_

¡Pregunta lo que necesites! 🚍`;
}

/**
 * Genera estadísticas del sistema
 */
async function generarEstadisticas() {
    try {
        const stats = await obtenerEstadisticas();
        
        // Formatear fecha y hora argentina
        const ahora = new Date();
        const opcionesArgentina = {
            timeZone: 'America/Argentina/Cordoba',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        // Formatear manualmente para evitar problemas de locale
    const fechaLocal = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Cordoba' }));
    const dia = String(fechaLocal.getDate()).padStart(2, '0');
    const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
    const año = fechaLocal.getFullYear();
    const horas = String(fechaLocal.getHours()).padStart(2, '0');
    const minutos = String(fechaLocal.getMinutes()).padStart(2, '0');
    const segundos = String(fechaLocal.getSeconds()).padStart(2, '0');
    
    const fechaHoraArgentina = `${dia}/${mes}/${año}, ${horas}:${minutos}:${segundos}`;
        
        return `📊 **Estadísticas TuBondi Alertas**

🚌 **Total de registros:** ${stats.total.toLocaleString()}
📅 **Última actualización:** ${fechaHoraArgentina}
🔄 **Estado del sistema:** ✅ Operativo

💡 El sistema monitorea colectivos cada 2 minutos y guarda los datos en tiempo real.

🚍 ¿Quieres consultar alguna línea específica?`;
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return '❌ Error obteniendo estadísticas del sistema. Intenta de nuevo más tarde.';
    }
}

/**
 * Consulta datos de colectivos - Supabase primero, API como fallback
 */
async function consultarDatosColectivos(texto) {
    const numeroLinea = extraerNumeroLinea(texto);
    const ubicacion = extraerUbicacion(texto);
    
    console.log(`🔍 Número de línea extraído: ${numeroLinea}`);
    console.log(`🗺️ Ubicación detectada: ${ubicacion.ubicacion} (parada: ${ubicacion.parada_principal})`);
    
    // ESTRATEGIA PRINCIPAL: API en tiempo real con ubicación específica
    console.log('🚌 Consultando API en tiempo real con ubicación...');
    
    // Lista de paradas a intentar: principal + alternativas
    const paradasAIntentar = [ubicacion.parada_principal, ...ubicacion.paradas_alternativas];
    
    for (let i = 0; i < paradasAIntentar.length; i++) {
        const parada = paradasAIntentar[i];
        const esPrincipal = i === 0;
        
        try {
            console.log(`${esPrincipal ? '🎯' : '🔄'} Intentando parada ${esPrincipal ? 'principal' : 'alternativa'}: ${parada}`);
            const datos = await tubondiService.obtenerProximosArribos(parada);
            
            if (datos && datos.length > 0) {
                console.log(`✅ Datos obtenidos de parada ${parada}`);
                if (numeroLinea) {
                    return generarRespuestaLineaEspecifica(datos, numeroLinea);
                } else {
                    return generarRespuestaGeneral(datos);
                }
            } else {
                console.log(`⚠️ Parada ${parada} sin datos disponibles`);
            }
            
        } catch (error) {
            console.log(`❌ Error en parada ${parada}:`, error.message);
        }
    }
    
    // FALLBACK: Usar datos de Supabase
    try {
        console.log('💾 Usando datos de Supabase como fallback...');
        const datosSupabase = await consultarDatosSupabaseExtendido(numeroLinea);
        
        if (datosSupabase && !datosSupabase.includes('No hay datos disponibles')) {
            console.log('✅ Usando datos de Supabase');
            return datosSupabase;
        } else {
            console.log('⚠️ No hay datos en Supabase');
        }
        
    } catch (error) {
        console.log('❌ Error consultando Supabase:', error.message);
    }
    
    // FALLBACK: Solo si no hay datos recientes en Supabase, intentar API
    try {
        console.log('🚌 Datos de Supabase viejos, intentando API en tiempo real...');
        
        // Timeout muy corto para la API - solo si es rápida
        const datos = await Promise.race([
            tubondiService.obtenerDatosCoches(numeroLinea || '60'),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('API muy lenta')), 10000) // Solo 10 segundos
            )
        ]);
        
        if (datos && datos.length > 0) {
            console.log('✅ Datos en tiempo real obtenidos (API rápida)');
            if (numeroLinea) {
                return generarRespuestaLineaEspecifica(datos, numeroLinea);
            } else {
                return generarRespuestaGeneral(datos);
            }
        }
        
    } catch (error) {
        console.log('⚠️ API en tiempo real falló o fue muy lenta');
    }
    
    // ÚLTIMO RECURSO: Respuesta informativa con datos útiles
    console.log('💡 Generando respuesta informativa...');
    return generarRespuestaInformativaUbicacion(numeroLinea, ubicacion);
}

/**
 * Consulta datos de Supabase como fallback
 */
async function consultarDatosSupabase(numeroLinea) {
    console.log('💾 Consultando datos de Supabase...');
    
    try {
        let query = supabase
            .from('coches')
            .select('*')
            .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // últimos 30 minutos
            .order('created_at', { ascending: false });
        
        if (numeroLinea) {
            query = query.eq('linea', numeroLinea);
        }
        
        const { data, error } = await query.limit(20);
        
        if (error) {
            console.error('❌ Error consultando Supabase:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            if (numeroLinea) {
                return `🚌 No encontré datos recientes de la línea ${numeroLinea} en la base de datos.

💡 Los datos se actualizan cada 2 minutos. Intenta de nuevo en unos momentos.`;
            } else {
                return `📊 No hay datos recientes en la base de datos.

🔄 El sistema se actualiza cada 2 minutos automáticamente.`;
            }
        }
        
        console.log(`💾 Encontrados ${data.length} registros en Supabase`);
        
        if (numeroLinea) {
            return generarRespuestaSupabaseLineaEspecifica(data, numeroLinea);
        } else {
            return generarRespuestaSupabaseGeneral(data);
        }
        
    } catch (error) {
        console.error('❌ Error en consultarDatosSupabase:', error);
        throw error;
    }
}

/**
 * Genera respuesta específica usando datos de Supabase
 */
function generarRespuestaSupabaseLineaEspecifica(data, numeroLinea) {
    const cochesUnicos = new Map();
    
    // Agrupar por coche y tomar el más reciente
    data.forEach(registro => {
        const key = registro.coche;
        if (!cochesUnicos.has(key) || new Date(registro.created_at) > new Date(cochesUnicos.get(key).created_at)) {
            cochesUnicos.set(key, registro);
        }
    });
    
    const cochesArray = Array.from(cochesUnicos.values());
    
    let respuesta = `🚌 **Línea ${numeroLinea}** - ${cochesArray.length} colectivo${cochesArray.length > 1 ? 's' : ''} (datos recientes):\n\n`;
    
    cochesArray.slice(0, 3).forEach((coche, index) => {
        const tiempo = coche.tiempo ? ` (${coche.tiempo})` : '';
        const fechaActualizacion = new Date(coche.created_at);
        const minutosAtras = Math.round((Date.now() - fechaActualizacion.getTime()) / 60000);
        
        respuesta += `🚍 **Coche ${coche.coche}**${tiempo}\n`;
        respuesta += `📍 ${coche.lat}, ${coche.lon}\n`;
        respuesta += `🕐 Hace ${minutosAtras} minuto${minutosAtras !== 1 ? 's' : ''}\n\n`;
    });
    
    if (cochesArray.length > 3) {
        respuesta += `... y ${cochesArray.length - 3} colectivos más\n\n`;
    }
    
    respuesta += `💾 Datos de la base de datos (últimos 30 min)\n`;
    respuesta += `🔄 Para datos en tiempo real, intenta de nuevo en unos minutos`;
    
    return respuesta;
}

/**
 * Genera respuesta general usando datos de Supabase
 */
function generarRespuestaSupabaseGeneral(data) {
    const lineasUnicas = [...new Set(data.map(c => c.linea))].sort();
    const cochesUnicos = new Set(data.map(c => c.coche)).size;
    
    let respuesta = `📊 **Estado del sistema TuBondi** (datos recientes)\n\n`;
    respuesta += `🚍 **${cochesUnicos} colectivos** registrados\n`;
    respuesta += `📋 **${lineasUnicas.length} líneas** con actividad\n\n`;
    
    respuesta += `🚌 **Líneas activas:**\n${lineasUnicas.join(', ')}\n\n`;
    
    const ultimaActualizacion = new Date(Math.max(...data.map(d => new Date(d.created_at))));
    const minutosAtras = Math.round((Date.now() - ultimaActualizacion.getTime()) / 60000);
    
    respuesta += `🕐 Última actualización: hace ${minutosAtras} minuto${minutosAtras !== 1 ? 's' : ''}\n`;
    respuesta += `💡 Escribe "línea X" para info específica\n`;
    respuesta += `🔄 Para datos en tiempo real, intenta de nuevo en unos minutos`;
    
    return respuesta;
}

/**
 * Consulta datos de Supabase con rango extendido (último recurso)
 */
async function consultarDatosSupabaseExtendido(numeroLinea) {
    console.log('💾 Consultando Supabase con rango extendido (últimas 2 horas)...');
    
    try {
        let query = supabase
            .from('coches')
            .select('*')
            .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // últimas 2 horas
            .order('created_at', { ascending: false });
        
        if (numeroLinea) {
            query = query.eq('linea', numeroLinea);
        }
        
        const { data, error } = await query.limit(50);
        
        if (error) {
            throw error;
        }
        
        if (!data || data.length === 0) {
            return `🚌 No hay datos disponibles para la línea ${numeroLinea || 'solicitada'}.

🔄 El sistema de monitoreo puede estar temporalmente inactivo.
💡 Intenta de nuevo en unos minutos.`;
        }
        
        console.log(`💾 Encontrados ${data.length} registros históricos`);
        
        if (numeroLinea) {
            return generarRespuestaSupabaseLineaEspecifica(data, numeroLinea);
        } else {
            return generarRespuestaSupabaseGeneral(data);
        }
        
    } catch (error) {
        console.error('❌ Error en consultarDatosSupabaseExtendido:', error);
        throw error;
    }
}

/**
 * Extrae número de línea del texto
 */
function extraerNumeroLinea(texto) {
    console.log(`🔍 Analizando texto para extraer línea: "${texto}"`);
    
    // Buscar patrones específicos primero
    const patronesEspecificos = [
        /l[íi]nea\s+(\d+)/i,
        /ruta\s+(\d+)/i,
        /n[úu]mero\s+(\d+)/i,
        /bondi\s+(\d+)/i,
        /colectivo\s+(\d+)/i
    ];
    
    for (const patron of patronesEspecificos) {
        const match = texto.match(patron);
        if (match) {
            console.log(`✅ Patrón específico encontrado: ${patron} -> ${match[1]}`);
            return match[1];
        }
    }
    
    // Si no hay patrones específicos, buscar números comunes de líneas de Córdoba
    const numerosComunes = ['60', '12', '30', '31', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];
    for (const numero of numerosComunes) {
        if (texto.includes(numero)) {
            console.log(`✅ Número común encontrado: ${numero}`);
            return numero;
        }
    }
    
    console.log('❌ No se encontró número de línea');
    return null;
}

/**
 * Genera respuesta para una línea específica
 */
function generarRespuestaLineaEspecifica(datos, numeroLinea) {
    const cochesLinea = datos.filter(coche => 
        coche.linea === numeroLinea || 
        coche.ruta === numeroLinea ||
        coche.linea_nombre === numeroLinea
    );
    
    if (cochesLinea.length === 0) {
        const lineasDisponibles = [...new Set(datos.map(c => c.linea || c.linea_nombre))].sort();
        return `🚌 No encontré colectivos de la línea ${numeroLinea} circulando en este momento.

💡 Líneas disponibles: ${lineasDisponibles.join(', ')}`;
    }
    
    // Detectar si son datos de proximos_arribos (tienen hora_salida) o tradicionales
    const esProximosArribos = cochesLinea.some(c => c.hora_salida || c.parada_descripcion);
    
    if (esProximosArribos) {
        return generarRespuestaProximosArribos(cochesLinea, numeroLinea);
    } else {
        return generarRespuestaTradicional(cochesLinea, numeroLinea);
    }
}

/**
 * Genera respuesta para datos de proximos_arribos (tiempo real)
 */
function generarRespuestaProximosArribos(cochesLinea, numeroLinea) {
    const primerCoche = cochesLinea[0];
    const parada = primerCoche.parada_descripcion ? 
        `${primerCoche.parada_descripcion} (${primerCoche.parada_codigo})` : 
        'Centro';
    
    let respuesta = `🚌 **Línea ${numeroLinea}** - Próximos arribos\n`;
    respuesta += `📍 **Parada:** ${parada}\n\n`;
    
    cochesLinea.slice(0, 3).forEach((coche, index) => {
        const tiempoLlegada = coche.tiempo || coche.hora_salida;
        const esGPS = coche.es_gps;
        const tipoEstimacion = esGPS ? '📡 GPS' : '📋 Diagrama';
        const rampa = coche.rampa == "1" ? ' ♿' : '';
        
        respuesta += `🚍 **Línea ${coche.linea}**${rampa}\n`;
        respuesta += `⏰ Llega en: **${tiempoLlegada}** (${tipoEstimacion})\n`;
        
        if (coche.ruta_descripcion) {
            respuesta += `🎯 ${coche.ruta_descripcion}\n`;
        }
        
        if (esGPS && coche.coche && coche.coche !== 'N/A') {
            respuesta += `🚌 Coche: ${coche.coche}\n`;
        }
        
        if (coche.notificacion) {
            respuesta += `⚠️ ${coche.notificacion.replace(/\r\n/g, ' ')}\n`;
        }
        
        respuesta += '\n';
    });
    
    if (cochesLinea.length > 3) {
        respuesta += `... y ${cochesLinea.length - 3} colectivos más\n\n`;
    }
    
    // Formatear fecha y hora argentina
    const ahora = new Date();
    const opcionesArgentina = {
        timeZone: 'America/Argentina/Cordoba',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    // Formatear manualmente para evitar problemas de locale
    const fechaLocal = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Cordoba' }));
    const dia = String(fechaLocal.getDate()).padStart(2, '0');
    const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
    const año = fechaLocal.getFullYear();
    const horas = String(fechaLocal.getHours()).padStart(2, '0');
    const minutos = String(fechaLocal.getMinutes()).padStart(2, '0');
    const segundos = String(fechaLocal.getSeconds()).padStart(2, '0');
    
    const fechaHoraArgentina = `${dia}/${mes}/${año}, ${horas}:${minutos}:${segundos}`;
    respuesta += `🔄 Datos en tiempo real: ${fechaHoraArgentina}`;
    
    return respuesta;
}

/**
 * Genera respuesta para línea específica desde proximos_arribos
 */
function generarRespuestaLineaEspecifica(datos, numeroLinea) {
    console.log(`🎯 Generando respuesta para línea específica: ${numeroLinea}`);
    
    // Filtrar solo la línea solicitada
    const datosLinea = datos.filter(d => d.linea === numeroLinea.toString());
    
    if (datosLinea.length === 0) {
        return `🚌 No encontré colectivos de la línea ${numeroLinea} en esta parada.\n📍 **Parada:** ${datos[0]?.parada_descripcion || 'Información de parada'}\n\n💡 **Líneas disponibles en esta parada:**\n${datos.map(d => d.linea).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`;
    }
    
    let respuesta = `🚌 **Línea ${numeroLinea}** - Próximos arribos\n📍 **Parada:** ${datosLinea[0].parada_descripcion || 'Información de parada'}\n\n`;
    
    datosLinea.slice(0, 3).forEach((coche) => {
        const tipoTiempo = coche.coche && coche.coche !== '0' ? '📡 GPS' : '📋 Diagrama';
        const rampa = coche.rampa === '2' ? ' ♿' : '';
        const notif = coche.notificacion ? `\n⚠️ ${coche.notificacion.replace(/\r\n/g, ' ')}` : '';
        
        respuesta += `🚍 **Línea ${coche.linea}**${rampa}\n`;
        respuesta += `⏰ Llega en: **${coche.tiempo || coche.demora}** (${tipoTiempo})\n`;
        respuesta += `🎯 ${coche.ruta_descripcion || 'Recorrido'}\n`;
        if (coche.coche && coche.coche !== '0') {
            respuesta += `🚌 Coche: ${coche.coche}\n`;
        }
        respuesta += notif + '\n\n';
    });
    
    // Agregar timestamp
    const ahora = new Date();
    const opcionesArgentina = {
        timeZone: 'America/Argentina/Cordoba',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    // Formatear manualmente para evitar problemas de locale
    const fechaLocal = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Cordoba' }));
    const dia = String(fechaLocal.getDate()).padStart(2, '0');
    const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
    const año = fechaLocal.getFullYear();
    const horas = String(fechaLocal.getHours()).padStart(2, '0');
    const minutos = String(fechaLocal.getMinutes()).padStart(2, '0');
    const segundos = String(fechaLocal.getSeconds()).padStart(2, '0');
    
    const fechaHoraArgentina = `${dia}/${mes}/${año}, ${horas}:${minutos}:${segundos}`;
    respuesta += `🔄 Datos en tiempo real: ${fechaHoraArgentina}`;
    
    return respuesta;
}

/**
 * Genera respuesta general desde proximos_arribos (todas las líneas)
 */
function generarRespuestaGeneral(datos) {
    console.log(`🎯 Generando respuesta general para ${datos.length} arribos`);
    
    let respuesta = `🚌 **Próximos colectivos**\n📍 **Parada:** ${datos[0]?.parada_descripcion || 'Información de parada'}\n\n`;
    
    // Agrupar por línea para mostrar mejor
    const porLinea = {};
    datos.forEach(coche => {
        if (!porLinea[coche.linea]) {
            porLinea[coche.linea] = [];
        }
        porLinea[coche.linea].push(coche);
    });
    
    // Mostrar hasta 3 líneas diferentes
    const lineas = Object.keys(porLinea).slice(0, 3);
    
    lineas.forEach(linea => {
        const coche = porLinea[linea][0]; // Tomar el próximo
        const tipoTiempo = coche.coche && coche.coche !== '0' ? '📡 GPS' : '📋 Diagrama';
        const rampa = coche.rampa === '2' ? ' ♿' : '';
        const notif = coche.notificacion ? `\n⚠️ ${coche.notificacion.replace(/\r\n/g, ' ')}` : '';
        
        respuesta += `🚍 **Línea ${coche.linea}**${rampa}\n`;
        respuesta += `⏰ Llega en: **${coche.tiempo || coche.demora}** (${tipoTiempo})\n`;
        respuesta += `🎯 ${coche.ruta_descripcion || 'Recorrido'}\n`;
        if (coche.coche && coche.coche !== '0') {
            respuesta += `🚌 Coche: ${coche.coche}\n`;
        }
        respuesta += notif + '\n\n';
    });
    
    // Agregar timestamp
    const ahora = new Date();
    // Formatear manualmente para evitar problemas de locale
    const fechaLocal = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Cordoba' }));
    const dia = String(fechaLocal.getDate()).padStart(2, '0');
    const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
    const año = fechaLocal.getFullYear();
    const horas = String(fechaLocal.getHours()).padStart(2, '0');
    const minutos = String(fechaLocal.getMinutes()).padStart(2, '0');
    const segundos = String(fechaLocal.getSeconds()).padStart(2, '0');
    
    const fechaHoraArgentina = `${dia}/${mes}/${año}, ${horas}:${minutos}:${segundos}`;
    respuesta += `🔄 Datos en tiempo real: ${fechaHoraArgentina}`;
    
    return respuesta;
}

/**
 * Genera respuesta para datos tradicionales
 */
function generarRespuestaTradicional(cochesLinea, numeroLinea) {
    let respuesta = `🚌 **Línea ${numeroLinea}** - ${cochesLinea.length} colectivo${cochesLinea.length > 1 ? 's' : ''} en circulación:\n\n`;
    
    cochesLinea.slice(0, 3).forEach((coche, index) => {
        const tiempo = coche.tiempo ? ` (${coche.tiempo})` : '';
        const sentido = coche.sentido ? ` - Sentido ${coche.sentido}` : '';
        const itinerario = coche.itinerario_codigo ? ` [${coche.itinerario_codigo}]` : '';
        
        respuesta += `🚍 **Coche ${coche.coche}**${tiempo}${sentido}\n`;
        respuesta += `📍 ${coche.lat}, ${coche.lon}${itinerario}\n`;
        
        if (coche.itinerario_fechayhora) {
            const fecha = new Date(coche.itinerario_fechayhora);
            respuesta += `🕐 Última actualización: ${fecha.toLocaleTimeString('es-AR')}\n`;
        }
        
        respuesta += `\n`;
    });
    
    if (cochesLinea.length > 3) {
        respuesta += `... y ${cochesLinea.length - 3} colectivos más\n\n`;
    }
    
    respuesta += `📍 Usa las coordenadas en Google Maps para ubicación exacta\n`;
    // Formatear fecha y hora argentina
    const ahora = new Date();
    const opcionesArgentina = {
        timeZone: 'America/Argentina/Cordoba',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    // Formatear manualmente para evitar problemas de locale
    const fechaLocal = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Cordoba' }));
    const dia = String(fechaLocal.getDate()).padStart(2, '0');
    const mes = String(fechaLocal.getMonth() + 1).padStart(2, '0');
    const año = fechaLocal.getFullYear();
    const horas = String(fechaLocal.getHours()).padStart(2, '0');
    const minutos = String(fechaLocal.getMinutes()).padStart(2, '0');
    const segundos = String(fechaLocal.getSeconds()).padStart(2, '0');
    
    const fechaHoraArgentina = `${dia}/${mes}/${año}, ${horas}:${minutos}:${segundos}`;
    respuesta += `🔄 Datos en tiempo real: ${fechaHoraArgentina}`;
    
    return respuesta;
}

/**
 * Genera respuesta general del sistema
 */
function generarRespuestaGeneral(datos) {
    const lineasUnicas = [...new Set(datos.map(c => c.linea))].sort();
    const totalCoches = datos.length;
    
    let respuesta = `🚌 **Estado actual del sistema TuBondi**\n\n`;
    respuesta += `🚍 **${totalCoches} colectivos** en circulación\n`;
    respuesta += `📋 **${lineasUnicas.length} líneas** activas\n\n`;
    
    respuesta += `🚌 **Líneas disponibles:**\n${lineasUnicas.join(', ')}\n\n`;
    
    respuesta += `💡 **Para consultar una línea específica:**\n`;
    respuesta += `Escribe "línea X" (ej: "línea 60")\n\n`;
    
    respuesta += `🔄 Datos actualizados: ${new Date().toLocaleString('es-AR')}`;
    
    return respuesta;
}

/**
 * Envía mensaje de WhatsApp usando la API
 */
async function enviarMensajeWhatsApp(to, mensaje) {
    console.log('🔍 DEBUG enviarMensajeWhatsApp - Iniciando...');
    console.log('📞 Destinatario:', to);
    console.log('💬 Mensaje a enviar:', mensaje.substring(0, 100) + '...');
    
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
        console.error('❌ Faltan credenciales para enviar mensajes de WhatsApp');
        console.error('ACCESS_TOKEN:', ACCESS_TOKEN ? 'CONFIGURADO' : 'FALTANTE');
        console.error('PHONE_NUMBER_ID:', PHONE_NUMBER_ID ? 'CONFIGURADO' : 'FALTANTE');
        return;
    }
    
    try {
        const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
        
        const payload = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
                body: mensaje
            }
        };
        
        const config = {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };
        
        console.log(`📤 Enviando mensaje a ${to}...`);
        console.log('🌐 URL:', url);
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post(url, payload, config);
        
        console.log('📨 Respuesta de Facebook:', response.status, response.statusText);
        console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.status === 200) {
            console.log(`✅ Mensaje enviado exitosamente a ${to}`);
        } else {
            console.error(`❌ Error enviando mensaje: ${response.status} - ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Error enviando mensaje de WhatsApp:', error.message);
        if (error.response) {
            console.error('🔴 Response status:', error.response.status);
            console.error('🔴 Response data:', JSON.stringify(error.response.data, null, 2));
        }
        if (error.request) {
            console.error('🔴 Request error:', error.request);
        }
    }
}

module.exports = app;

