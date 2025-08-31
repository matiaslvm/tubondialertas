# Configuración Correcta del Webhook

## Variables de Entorno Correctas

```bash
# Token de verificación del webhook (debe ser un string simple, NO el token de acceso)
WHATSAPP_VERIFY_TOKEN=mi_token_verificacion_123

# Token de acceso de la API de WhatsApp (el token largo)
WHATSAPP_ACCESS_TOKEN=EAAg8tlZCAQqQBPU4BTWn3RRF8qCXtWI5LD8AbekzK5vVBsWSDfvvFxZB15a4pRDZB1G4rmtZAnlfq3AN4ZADMQ54TvZBEoyZCSgfF7CB8GhlZBTca3aTMZCxSYhVMZCj2PYy8V8gyerdQfRjjR7RsCqMe4IzMePjkx1A17D6lg5mU4DzVUyK1qTJ1uqDvASXaStOuHzAZDZD

# ID del número de teléfono
WHATSAPP_PHONE_NUMBER_ID=450936411444382

# Versión de la API
WHATSAPP_API_VERSION=v21.0

# Puerto del servidor
PORT=3000
```

## Diferencia Importante entre Tokens

### WHATSAPP_VERIFY_TOKEN
- **Qué es**: Un string simple que TÚ defines
- **Para qué**: Verificar que eres el dueño del webhook
- **Ejemplo**: `"mi_token_123"` o `"webhook_verificacion_2024"`
- **Dónde se usa**: En la verificación inicial del webhook

### WHATSAPP_ACCESS_TOKEN  
- **Qué es**: Token generado por Facebook
- **Para qué**: Hacer llamadas a la API de WhatsApp
- **Ejemplo**: `EAAg8tlZCAQqQBPU4BTWn3RRF8qCXtWI5LD8Abekz...`
- **Dónde se usa**: Para enviar mensajes, obtener media, etc.

## Error Actual

❌ **INCORRECTO** (lo que tienes ahora):
```
WHATSAPP_WEBHOOK_TOKEN=EAAg8tlZCAQqQBPedSyyiZB9Xr9y0wTdYykdg2HC02vjZBz5eZBrorKbLEiszXANCKJbsk00P94Yrnb2oMe4qOwxG9jXTznwJdPxEGEGMg0xWHJnmaJUQKj4ZCQBuvstK13JvRCNvc61KlfNZAC6bJ2TnausUsFjOG2vLkJZBLXQiLcQZCyIv8IHGZBOgrht673bvTW43ZCAiVBvwpVNMfj44GL9JRmCG5IW9gHj9S1vNi9obVhIAZDZD
```

✅ **CORRECTO** (lo que debes usar):
```
WHATSAPP_VERIFY_TOKEN=mi_token_simple_123
WHATSAPP_ACCESS_TOKEN=EAAg8tlZCAQqQBPU4BTWn3RRF8qCXtWI5LD8AbekzK5vVBsWSDfvvFxZB15a4pRDZB1G4rmtZAnlfq3AN4ZADMQ54TvZBEoyZCSgfF7CB8GhlZBTca3aTMZCxSYhVMZCj2PYy8V8gyerdQfRjjR7RsCqMe4IzMePjkx1A17D6lg5mU4DzVUyK1qTJ1uqDvASXaStOuHzAZDZD
```