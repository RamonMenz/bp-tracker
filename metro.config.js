const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// O jsPDF (relatório PDF na Web) declara canvg, html2canvas e dompurify como dependências
// OPCIONAIS e os chama por import() só em doc.html()/SVG, que o Aferi não usa — o relatório é
// desenhado por primitivas vetoriais e AutoTable. Sem isto, o Metro empacota os três como chunks
// assíncronos e o bundle Web distribui ~267 KB de código morto. Restrito a imports vindos do
// próprio jsPDF: ninguém mais no projeto depende desses pacotes.
const JSPDF_UNUSED_OPTIONAL_DEPENDENCIES = new Set(['canvg', 'html2canvas', 'dompurify']);
const JSPDF_ORIGIN = /[\\/]node_modules[\\/]jspdf[\\/]/;
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // O export padrão nem inclui a voz ou seu chunk assíncrono no grafo do produto.
  if (moduleName === '@/screens/VoiceEntry' && (
    (platform === 'web' && process.env.EXPO_PUBLIC_WEB_VOICE_ENABLED !== 'true')
    || (platform === 'android' && process.env.EXPO_PUBLIC_ANDROID_VOICE_ENABLED !== 'true')
    || platform === 'ios'
  )) {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'src/screens/VoiceEntry.tsx') };
  }
  if (JSPDF_UNUSED_OPTIONAL_DEPENDENCIES.has(moduleName) && JSPDF_ORIGIN.test(context.originModulePath)) {
    return { type: 'empty' };
  }

  return (upstreamResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
