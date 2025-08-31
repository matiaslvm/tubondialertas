// Ejemplo de configuración correcta para webhook de WhatsApp Business API
const express = require('express');
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Token de verificación - debe coincidir con el que configures en Facebook
const VERIFY_TOKEN = "tu_token_de_verificacion_aqui"; // Cambia esto por tu token

// Endpoint para verificación del webhook (GET)
app.get('/webhook', (req, res) => {
    console.log('Recibida solicitud de verificación del webhook');
    
    // Facebook envía estos parámetros para verificar el webhook
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('Modo:', mode);
    console.log('Token recibido:', token);
    console.log('Challenge:', challenge);
    
    // Verificar que el modo sea 'subscribe' y el token coincida
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verificado correctamente');
        // Responder con el challenge para completar la verificación
        res.status(200).send(challenge);
    } else {
        console.log('❌ Error en la verificación del webhook');
        console.log('Token esperado:', VERIFY_TOKEN);
        console.log('Token recibido:', token);
        res.status(403).send('Forbidden');
    }
});

// Endpoint para recibir mensajes del webhook (POST)
app.post('/webhook', (req, res) => {
    console.log('Mensaje recibido del webhook:', JSON.stringify(req.body, null, 2));
    
    // Aquí procesarías los mensajes entrantes
    // ...tu lógica de manejo de mensajes...
    
    res.status(200).send('OK');
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📱 URL del webhook: tu_url_de_ngrok/webhook`);
    console.log(`🔑 Token de verificación: ${VERIFY_TOKEN}`);
});

module.exports = app;