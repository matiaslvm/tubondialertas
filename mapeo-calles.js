// Mapeo de calles/ubicaciones a códigos de paradas para TuBondi
// Basado en los datos reales de seleccionatraza

const MAPEO_CALLES_PARADAS = {
  // Paradas principales del centro
  'centro': ['LC08', 'LC06', 'OB05', 'OB04', 'OB03'],
  'colon': ['LC08', 'LC06'], // Av Colón
  'av colon': ['LC08', 'LC06'],
  'avenida colon': ['LC08', 'LC06'],
  
  // Williams (zona norte)
  'williams': ['RQ26', 'RQ20', 'AM24', 'AM21', 'AM27'],
  'aviador kingsley': ['RQ15', 'RQ11', 'RQ12'],
  'kingsley': ['RQ15', 'RQ11', 'RQ12'],
  
  // Pueyrredón
  'pueyrredon': ['OR01'],
  'pueyrredón': ['OR01'],
  'av pueyrredon': ['OR01'],
  'avenida pueyrredon': ['OR01'],
  
  // Mariano Moreno
  'mariano moreno': ['OB05', 'OB04'],
  'moreno': ['OB05', 'OB04'],
  
  // Roma
  'roma': ['GP33', 'GP34', 'PU36', 'PU37'],
  
  // Padre Luis Monti
  'padre luis monti': ['PU56', 'PU57', 'PU58', 'PU23', 'PU24', 'PU25', 'PU26', 'PU27', 'PU28', 'PU29', 'PU30', 'PU31', 'PU32'],
  'monti': ['PU56', 'PU57', 'PU58', 'PU23'],
  'luis monti': ['PU56', 'PU57', 'PU58', 'PU23'],
  
  // 24 de Septiembre
  '24 de septiembre': ['GP25', 'GP26', 'GP19', 'GP20'],
  'septiembre': ['GP25', 'GP26', 'GP19', 'GP20'],
  
  // Olmos
  'olmos': ['CE25', 'CC01'],
  'av olmos': ['CE25', 'CC01'],
  
  // Condarco
  'condarco': ['YS21', 'YS22'],
  
  // Bulnes
  'bulnes': ['YS03', 'MR12', 'MR13'],
  'bv bulnes': ['YS03', 'MR12', 'MR13'],
  'boulevard bulnes': ['YS03', 'MR12', 'MR13'],
  
  // Malvinas
  'malvinas': ['YN37', 'YN38', 'ML17'],
  
  // Urien
  'urien': ['MR14', 'MR17', 'MR18'],
  
  // Suipacha
  'suipacha': ['MR16'],
  
  // Zonas específicas
  'barrio jardin': ['RQ15', 'RQ11', 'RQ12'], // Inicio de línea 62
  'jardin': ['RQ15', 'RQ11', 'RQ12'],
  'nuestro hogar': ['H205', 'H208', 'H202'], // Zona residencial
  'hogar': ['H205', 'H208', 'H202'],
  'mercado abasto': ['MM01'],
  'abasto': ['MM01'],
  
  // Términos genéricos
  'terminal': ['LC08'], // Parada principal del centro
  'plaza': ['H201'], // Plaza principal
  'universidad': ['CE20'], // Zona universitaria
  'hospital': ['OB05'], // Zona de salud (centro)
};

// Función para extraer ubicación del texto
function extraerUbicacion(texto) {
    console.log(`🗺️ Analizando ubicación en: "${texto}"`);
    
    const textoLimpio = texto.toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e') 
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n');
    
    // PRIORIDAD 1: Buscar patrones específicos de ubicación PRIMERO
    const patronesEspecificos = [
        { patron: /estoy en ([a-z\s]+?)(?:\s+y|\s+para|\s+,|$)/i, grupo: 1, prioridad: 'origen' },
        { patron: /desde ([a-z\s]+?)(?:\s+y|\s+para|\s+,|$)/i, grupo: 1, prioridad: 'origen' },
        { patron: /por ([a-z\s]+?)(?:\s+y|\s+para|\s+,|$)/i, grupo: 1, prioridad: 'paso' },
        { patron: /en ([a-z\s]+?)(?:\s+y|\s+para|\s+,|$)/i, grupo: 1, prioridad: 'paso' }
    ];
    
    // Buscar patrones específicos primero
    for (const { patron, grupo, prioridad } of patronesEspecificos) {
        const match = texto.match(patron);
        if (match) {
            const ubicacionExtraida = match[grupo].toLowerCase().trim();
            console.log(`🔍 Patrón ${prioridad} encontrado: "${ubicacionExtraida}"`);
            
            // Buscar en el mapeo
            for (const [calle, paradas] of Object.entries(MAPEO_CALLES_PARADAS)) {
                if (ubicacionExtraida.includes(calle) || calle.includes(ubicacionExtraida)) {
                    console.log(`✅ Coincidencia ${prioridad}: ${calle} -> ${paradas[0]}`);
                    return {
                        ubicacion: calle,
                        parada_principal: paradas[0],
                        paradas_alternativas: paradas.slice(1),
                        todas_paradas: paradas,
                        tipo: prioridad
                    };
                }
            }
        }
    }
    
    // PRIORIDAD 2: Buscar coincidencias directas en el texto
    // Ordenar por longitud para que coincidencias más específicas tengan prioridad
    const callesOrdenadas = Object.keys(MAPEO_CALLES_PARADAS).sort((a, b) => b.length - a.length);
    
    for (const calle of callesOrdenadas) {
        if (textoLimpio.includes(calle)) {
            console.log(`✅ Ubicación directa encontrada: ${calle} -> ${MAPEO_CALLES_PARADAS[calle][0]}`);
            return {
                ubicacion: calle,
                parada_principal: MAPEO_CALLES_PARADAS[calle][0],
                paradas_alternativas: MAPEO_CALLES_PARADAS[calle].slice(1),
                todas_paradas: MAPEO_CALLES_PARADAS[calle],
                tipo: 'directo'
            };
        }
    }
    
    console.log('❌ No se encontró ubicación específica, usando parada por defecto');
    return {
        ubicacion: 'centro',
        parada_principal: 'LC08',
        paradas_alternativas: ['LC06', 'OB05'],
        todas_paradas: ['LC08', 'LC06', 'OB05'],
        tipo: 'defecto'
    };
}

// Test de la función
console.log('🧪 TESTING DETECCIÓN DE UBICACIONES:\n');

const testCases = [
    "estoy en williams y me quiero tomar el 62 para ir al centro, encuanto pasa?",
    "línea 60 por colon",
    "cuando pasa el colectivo por pueyrredon",
    "estoy en roma, cuando viene el bondi",
    "colectivo en bulnes",
    "línea 62"
];

testCases.forEach((texto, index) => {
    console.log(`${index + 1}️⃣ "${texto}"`);
    const resultado = extraerUbicacion(texto);
    console.log(`   🎯 Ubicación: ${resultado.ubicacion}`);
    console.log(`   📍 Parada principal: ${resultado.parada_principal}`);
    console.log(`   🔄 Alternativas: ${resultado.paradas_alternativas.join(', ')}`);
    console.log('');
});

module.exports = { MAPEO_CALLES_PARADAS, extraerUbicacion };
