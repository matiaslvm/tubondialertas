const express = require('express');
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Configuración usando el mismo patrón que funcionaba antes
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID;
const PORT = process.env.PORT || 3000;

console.log('🔧 Configuración detectada:');
console.log('VERIFY_TOKEN:', VERIFY_TOKEN ? `${VERIFY_TOKEN.substring(0, 20)}...` : 'NO DEFINIDO');
console.log('ACCESS_TOKEN:', ACCESS_TOKEN ? `${ACCESS_TOKEN.substring(0, 20)}...` : 'NO DEFINIDO');
console.log('PHONE_NUMBER_ID:', PHONE_NUMBER_ID || 'NO DEFINIDO');
console.log('PORT:', PORT);

// Endpoint para verificación del webhook (GET) - usando el patrón que funcionaba antes
app.get('/api/whatsapp-webhook', (req, res) => {
    console.log('\n🔍 === VERIFICACIÓN DEL WEBHOOK ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL completa:', req.url);
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('\n📋 Parámetros recibidos:');
    console.log('- hub.mode:', mode);
    console.log('- hub.verify_token:', token ? `${token.substring(0, 20)}...` : 'NO RECIBIDO');
    console.log('- hub.challenge:', challenge);
    
    console.log('\n🔑 Comparación de tokens:');
    console.log('Token esperado:', VERIFY_TOKEN ? `${VERIFY_TOKEN.substring(0, 20)}...` : 'NO CONFIGURADO');
    console.log('Token recibido:', token ? `${token.substring(0, 20)}...` : 'NO RECIBIDO');
    console.log('Tokens coinciden:', token === VERIFY_TOKEN);
    console.log('Modo correcto:', mode === 'subscribe');
    
    // Verificar que el modo sea 'subscribe' y el token coincida
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('\n✅ WEBHOOK VERIFICADO CORRECTAMENTE');
        console.log('Enviando challenge:', challenge);
        res.status(200).send(challenge);
    } else {
        console.log('\n❌ ERROR EN LA VERIFICACIÓN DEL WEBHOOK');
        if (mode !== 'subscribe') {
            console.log('- Modo incorrecto. Esperado: "subscribe", Recibido:', mode);
        }
        if (token !== VERIFY_TOKEN) {
            console.log('- Token incorrecto');
        }
        res.status(403).send('Forbidden');
    }
    console.log('=== FIN VERIFICACIÓN ===\n');
});

// También probar otros endpoints que aparecen en los logs
app.get('/webhook', (req, res) => {
    console.log('🔍 Verificación en /webhook');
    console.log('Redirigiendo a /api/whatsapp-webhook');
    
    // Redirigir con los mismos query params
    const queryString = new URLSearchParams(req.query).toString();
    res.redirect(`/api/whatsapp-webhook?${queryString}`);
});

app.get('/api/webhook', (req, res) => {
    console.log('🔍 Verificación en /api/webhook');
    console.log('Redirigiendo a /api/whatsapp-webhook');
    
    // Redirigir con los mismos query params
    const queryString = new URLSearchParams(req.query).toString();
    res.redirect(`/api/whatsapp-webhook?${queryString}`);
});

// Endpoint para recibir mensajes del webhook (POST)
app.post('/api/whatsapp-webhook', (req, res) => {
    console.log('\n📨 === MENSAJE RECIBIDO ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const body = req.body;
    
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const messages = body.entry[0].changes[0].value.messages;
            console.log('📱 Mensajes procesados:', messages.length);
            
            messages.forEach(message => {
                console.log(`- De: ${message.from}`);
                console.log(`- Texto: ${message.text?.body || 'Sin texto'}`);
                console.log(`- Tipo: ${message.type}`);
            });
        }
        res.status(200).send('OK');
    } else {
        console.log('❌ Objeto no reconocido');
        res.status(404).send('Not Found');
    }
    console.log('=== FIN MENSAJE ===\n');
});

// Endpoint de diagnóstico
app.get('/', (req, res) => {
    const diagnostico = {
        status: 'Server running',
        timestamp: new Date().toISOString(),
        port: PORT,
        config: {
            verify_token_configured: !!VERIFY_TOKEN,
            access_token_configured: !!ACCESS_TOKEN,
            phone_number_configured: !!PHONE_NUMBER_ID,
            verify_token_preview: VERIFY_TOKEN ? `${VERIFY_TOKEN.substring(0, 20)}...` : null
        },
        endpoints: {
            webhook_main: '/api/whatsapp-webhook (GET/POST)',
            webhook_alt1: '/webhook (GET - redirect)',
            webhook_alt2: '/api/webhook (GET - redirect)',
            diagnostics: '/ (GET)',
            health: '/health (GET)'
        },
        instructions: {
            facebook_url: 'https://TU_URL_NGROK.ngrok.io/api/whatsapp-webhook',
            verify_token: VERIFY_TOKEN ? `${VERIFY_TOKEN.substring(0, 20)}...` : 'NO CONFIGURADO'
        }
    };
    
    res.json(diagnostico);
});

// Endpoint de salud
app.get('/health', (req, res) => {
    console.log('💚 Health check solicitado');
    res.json({ 
        status: 'healthy', 
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log('\n🚀 ===== SERVIDOR INICIADO =====');
    console.log(`Puerto: ${PORT}`);
    console.log(`Endpoint principal: /api/whatsapp-webhook`);
    console.log(`URL para Facebook: https://TU_URL_NGROK.ngrok.io/api/whatsapp-webhook`);
    console.log(`Token de verificación: ${VERIFY_TOKEN ? `${VERIFY_TOKEN.substring(0, 20)}...` : 'NO CONFIGURADO'}`);
    console.log('================================\n');
    
    // Verificar configuración
    if (!VERIFY_TOKEN) {
        console.log('⚠️  ADVERTENCIA: No hay token de verificación configurado');
        console.log('   Configura WHATSAPP_VERIFY_TOKEN o WHATSAPP_WEBHOOK_TOKEN');
    }
    if (!ACCESS_TOKEN) {
        console.log('⚠️  ADVERTENCIA: No hay token de acceso configurado');
        console.log('   Configura WHATSAPP_ACCESS_TOKEN o WHATSAPP_TOKEN');
    }
    if (!PHONE_NUMBER_ID) {
        console.log('⚠️  ADVERTENCIA: No hay Phone Number ID configurado');
        console.log('   Configura WHATSAPP_PHONE_NUMBER_ID o PHONE_NUMBER_ID');
    }
    
    console.log('\n💡 Para probar localmente:');
    console.log(`curl "http://localhost:${PORT}/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test123"`);
});

module.exports = app;