// @ts-check
import { defineConfig } from 'astro/config';

// Site estático: o Astro gera o dist/ e o Worker (src/worker/index.js) serve-o como ficheiros estáticos.
export default defineConfig({
  site: 'https://wakenbake.pt',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    // Nada de CSS embutido no HTML: tudo em ficheiros, para a política de conteúdo (CSP) ficar apertada.
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
  // Nenhum script embutido no HTML (o Vite embute os pequenos por defeito): a CSP só aceita scripts em ficheiro.
  vite: { build: { assetsInlineLimit: 0 } },
});
