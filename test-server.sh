#!/bin/bash

echo "🔍 Verificando estado del servidor..."

# Verificar si hay algo corriendo en el puerto 3000
echo "Verificando puerto 3000:"
curl -s http://localhost:3000/health 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Servidor respondiendo en puerto 3000"
else
    echo "❌ No hay respuesta en puerto 3000"
fi

echo ""
echo "Verificando puertos en uso:"
netstat -tulpn 2>/dev/null | grep :3000 || echo "Puerto 3000 no está en uso"

echo ""
echo "Verificando procesos Node.js:"
ps aux | grep node | grep -v grep || echo "No hay procesos Node.js ejecutándose"

echo ""
echo "💡 Si no hay servidor corriendo, necesitas ejecutar:"
echo "node tu_archivo_servidor.js"