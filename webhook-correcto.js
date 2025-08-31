const express = require('express');
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Variables de entorno
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "mi_token_verificacion_123";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const PORT = process.env.PORT || 3000;

// Endpoint para verificación del webhook (GET)
// Facebook accede a: /api/whatsapp-webhook
app.get('/api/whatsapp-webhook', (req, res) => {
    console.log('🔍 Verificación del webhook recibida');
    console.log('Query params:', req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('Modo:', mode);
    console.log('Token recibido:', token);
    console.log('Token esperado:', VERIFY_TOKEN);
    console.log('Challenge:', challenge);
    
    // Verificar que el modo sea 'subscribe' y el token coincida
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verificado correctamente');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Error en la verificación del webhook');
        console.log('Modo correcto:', mode === 'subscribe');
        console.log('Token correcto:', token === VERIFY_TOKEN);
        res.status(403).send('Forbidden');
    }
});

// Endpoint para recibir mensajes del webhook (POST)
app.post('/api/whatsapp-webhook', (req, res) => {
    console.log('📨 Mensaje recibido del webhook');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Aquí procesarías los mensajes entrantes
    const body = req.body;
    
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const messages = body.entry[0].changes[0].value.messages;
            console.log('Mensajes:', messages);
            
            // Procesar cada mensaje
            messages.forEach(message => {
                console.log(`Mensaje de ${message.from}: ${message.text?.body || 'Sin texto'}`);
                // Aquí añadirías tu lógica para responder
            });
        }
        res.status(200).send('OK');
    } else {
        res.status(404).send('Not Found');
    }
});

// Endpoint de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
    res.json({
        status: 'Server running',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhook_get: '/api/whatsapp-webhook (GET)',
            webhook_post: '/api/whatsapp-webhook (POST)'
        }
    });
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', port: PORT });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📱 Endpoint del webhook: /api/whatsapp-webhook`);
    console.log(`🔑 Token de verificación: ${VERIFY_TOKEN}`);
    console.log(`💡 URL completa para Facebook: https://TU_URL_NGROK.ngrok.io/api/whatsapp-webhook`);
    
    // Verificar variables de entorno
    if (!ACCESS_TOKEN) {
        console.log('⚠️  ADVERTENCIA: WHATSAPP_ACCESS_TOKEN no está configurado');
    }
    if (!PHONE_NUMBER_ID) {
        console.log('⚠️  ADVERTENCIA: WHATSAPP_PHONE_NUMBER_ID no está configurado');
    }
});

module.exports = app;