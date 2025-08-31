require('dotenv').config();
const ngrok = require('ngrok');

/**
 * Script para configurar ngrok
 */
async function configurarNgrok() {
  try {
    console.log('🔗 Configurando ngrok...');
    
    const authToken = process.env.NGROK_AUTH_TOKEN;
    
    if (!authToken) {
      console.log('ℹ️  NGROK_AUTH_TOKEN no configurado');
      console.log('📋 Para obtener un token gratuito:');
      console.log('   1. Ve a https://ngrok.com/');
      console.log('   2. Crea una cuenta gratuita');
      console.log('   3. Ve a https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('   4. Copia tu authtoken y agrégalo a .env como NGROK_AUTH_TOKEN=tu_token');
      console.log('');
      console.log('⚠️  Sin authtoken, ngrok funcionará con limitaciones');
      return;
    }

    // Configurar authtoken
    await ngrok.authtoken(authToken);
    console.log('✅ Authtoken de ngrok configurado');

    // Probar conexión
    const puerto = process.env.WHATSAPP_WEBHOOK_PORT || 3000;
    console.log(`🔄 Probando túnel en puerto ${puerto}...`);
    
    const url = await ngrok.connect({
      port: puerto,
      proto: 'http'
    });

    console.log('✅ Túnel ngrok creado exitosamente!');
    console.log(`🌐 URL pública: ${url}`);
    console.log(`📱 Webhook URL: ${url}/webhook`);
    console.log('');
    console.log('📋 Configuración para WhatsApp Business API:');
    console.log(`   Webhook URL: ${url}/webhook`);
    console.log(`   Verify Token: ${process.env.WHATSAPP_WEBHOOK_TOKEN || 'configura_WHATSAPP_WEBHOOK_TOKEN'}`);

    // Mantener el túnel abierto por 30 segundos para pruebas
    console.log('⏱️  Manteniendo túnel abierto por 30 segundos...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Cerrar túnel
    await ngrok.disconnect();
    console.log('🔗 Túnel cerrado');

  } catch (error) {
    console.error('❌ Error configurando ngrok:', error.message);
    
    if (error.message.includes('authtoken')) {
      console.log('💡 Solución: Verifica que tu NGROK_AUTH_TOKEN sea correcto');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  configurarNgrok();
}

module.exports = configurarNgrok;


