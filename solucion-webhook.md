# Solución para Error de Webhook de Facebook

## El Problema
Error: "No se pudo validar la URL de devolución de llamada o el token de verificación"

## Causas Comunes y Soluciones

### 1. **Token de Verificación Incorrecto**
- El token que configuras en Facebook debe coincidir EXACTAMENTE con el que tienes en tu código
- Es case-sensitive (sensible a mayúsculas/minúsculas)

### 2. **Endpoint GET no implementado correctamente**
Facebook necesita un endpoint GET que:
- Reciba `hub.mode`, `hub.verify_token`, y `hub.challenge`
- Verifique que `hub.mode === 'subscribe'`
- Verifique que `hub.verify_token` coincida con tu token
- Responda con el `hub.challenge` si todo es correcto

### 3. **URL de ngrok incorrecta**
- Asegúrate de usar HTTPS (no HTTP)
- La URL debe terminar en `/webhook`
- Ejemplo: `https://abc123.ngrok.io/webhook`

### 4. **Servidor no respondiendo**
- Verifica que tu servidor esté ejecutándose
- Verifica que ngrok esté apuntando al puerto correcto
- Prueba acceder a tu URL de ngrok desde el navegador

## Pasos para Solucionar

### Paso 1: Verificar tu código del webhook
Asegúrate de tener algo como esto en tu servidor:

```javascript
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === 'TU_TOKEN_AQUI') {
        res.status(200).send(challenge);
    } else {
        res.status(403).send('Forbidden');
    }
});
```

### Paso 2: Probar manualmente el endpoint
Antes de configurar en Facebook, prueba tu endpoint:
```bash
curl "https://tu-url-ngrok.ngrok.io/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=test123"
```

Debería devolver "test123"

### Paso 3: Configurar en Facebook
1. Ve a tu app de Facebook Developer
2. En WhatsApp > Configuración
3. Agrega la URL: `https://tu-url-ngrok.ngrok.io/webhook`
4. Agrega el mismo token que tienes en tu código
5. Selecciona los eventos que quieres recibir (messages, etc.)

### Paso 4: Verificación
- Facebook enviará una petición GET para verificar
- Tu servidor debe responder con el challenge
- Si todo está bien, verás "✅ Completado" en Facebook

## Debugging Tips

1. **Revisa los logs de tu servidor** cuando Facebook intente verificar
2. **Verifica que ngrok esté activo**: `curl https://tu-url.ngrok.io/webhook`
3. **Asegúrate de que el puerto coincida** entre tu servidor y ngrok
4. **Usa HTTPS**, no HTTP
5. **El token no puede tener espacios ni caracteres especiales**

## Variables de Entorno Necesarias
```
VERIFY_TOKEN=tu_token_de_verificacion
WHATSAPP_TOKEN=tu_token_permanente_de_whatsapp
PORT=3000
```