// Configuração pública do site. Nada aqui é segredo: tudo isto aparece no próprio site.
export const SITE = {
  base: 'https://wakenbake.pt',
  nome: 'Wake n Bake',
  email: 'ola@wakenbake.pt',
  instagram: 'wakenbakept',
  // Chave pública do widget Turnstile «Lista de espera wakenbake.pt». O segredo fica só nos Secrets do Worker.
  turnstile: '0x4AAAAAAGVOJ_UZpwCLGUgn',
  // Token público do Cloudflare Web Analytics (sem cookies). Vazio = sem medição.
  analytics: '',
  lote: '068',
};

// Link do Instagram que abre a app no telemóvel quando ela existe e, sem app, abre o browser.
export const INSTAGRAM_WEB = `https://www.instagram.com/${SITE.instagram}/`;
export const INSTAGRAM_ANDROID = `intent://instagram.com/_u/${SITE.instagram}/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(`https://www.instagram.com/${SITE.instagram}/`)};end`;
