// Configuração pública do site. Nada aqui é segredo: tudo isto aparece no próprio site.
export const SITE = {
  base: 'https://wakenbake.pt',
  nome: 'Wake n Bake',
  email: 'ola@wakenbake.pt',
  // Responsável pelo tratamento de dados, como aparece na página de privacidade (RGPD, art. 13.º). Decisão do António.
  responsavel: 'Vasco Vairinhos, que faz a Wake n Bake',
  instagram: 'wakenbakept',
  // Chave pública do widget Turnstile «Lista de espera wakenbake.pt». O segredo fica só nos Secrets do Worker.
  turnstile: '0x4AAAAAAGVOJ_UZpwCLGUgn',
  // Estatística sem cookies: Cloudflare Web Analytics em modo automático (ativado a 27/11/2026).
  // A Cloudflare põe o script nas páginas servidas em wakenbake.pt; o staging não conta. Sem token no repositório.
  estatistica: true,
  // Só para o modo manual do Web Analytics (token público). Vazio enquanto o modo for automático,
  // para não contar as visitas a dobrar.
  analytics: '',
  lote: '068',
  // Página oficial do evento (GDG Faro). Ligada na etiqueta do topo da /devfest.
  devfest: 'https://gdg.community.dev/events/details/google-gdg-faro-presents-devfest-2026-build-secure-amp-scale-in-the-agentic-era/',
};

// Link do Instagram que abre a app no telemóvel quando ela existe e, sem app, abre o browser.
export const INSTAGRAM_WEB = `https://www.instagram.com/${SITE.instagram}/`;
export const INSTAGRAM_ANDROID = `intent://instagram.com/_u/${SITE.instagram}/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(`https://www.instagram.com/${SITE.instagram}/`)};end`;
