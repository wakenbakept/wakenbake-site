# Infraestrutura (sem chaves nem palavras-passe)

| Peça | Onde | Notas |
|---|---|---|
| Domínio wakenbake.pt | Hostinger (registo) | Servidores de nomes apontados para a Cloudflare (amir / connie.ns.cloudflare.com). |
| DNS, SSL, segurança | Cloudflare, conta da Wake n Bake (wakenbake.padaria@gmail.com), zona wakenbake.pt, plano Free | Always Use HTTPS ligado, TLS mínimo 1.2. HSTS curto no `_headers`; subir depois de estável. |
| Site e API | Cloudflare Worker `wakenbake-site` | Ficheiros estáticos (dist) + `/api/lista` e `/api/estado`. No ar desde 27/11/2026: domínios personalizados `wakenbake.pt` e `www.wakenbake.pt` (o Worker redireciona o www para wakenbake.pt). workers.dev de produção desligado. |
| Builds e staging | Workers Builds ligado ao GitHub (app «Cloudflare Workers and Pages» só no repositório wakenbake-site) | `main` = produção (`npx wrangler deploy`). Outros ramos = pré-visualização (`npx wrangler preview`, bloco `previews` no wrangler.jsonc). Staging: https://staging-wakenbake-site.wakenbake-padaria.workers.dev (ramo `staging`, noindex, inscrições na lista «Testes»). |
| Código | GitHub `wakenbakept/wakenbake-site` (conta pessoal do António, organização wakenbakept) | Público. `main` protegido (pull request obrigatório, squash, sem force push). Secret scanning e push protection ligados. |
| Lista de espera | Brevo (plano Free), conta da Wake n Bake | Domínio autenticado a 27/11/2026 (código Brevo, DKIM brevo1/brevo2, DMARC). Remetente «Wake n Bake» <ola@wakenbake.pt> verificado. Chave API «wakenbake-site worker 2», só contactos e emails transacionais, expira a 27/11/2027 (ou 90 dias sem uso). O Worker cria sozinho a pasta «Wake n Bake», as listas «Lista de espera» e «Testes», os atributos e o email de confirmação. |
| Anti-robô | Cloudflare Turnstile, widget «Lista de espera wakenbake.pt» | Chave pública em `src/config.js`. Hostnames: wakenbake.pt e wakenbake-padaria.workers.dev. |
| Reserva de inscrições | Cloudflare KV `wnb-site-lista` (UE) | Se o Brevo falhar, a inscrição fica aqui até 30 dias e o Worker reenvia de 30 em 30 minutos. Também guarda a configuração do Brevo (`cfg:brevo`). |
| Email ola@wakenbake.pt | Cloudflare Email Routing → wakenbake.padaria@gmail.com | Registos MX e SPF da Cloudflare. Ativo desde 27/11/2026. |

## Segredos do Worker (Settings → Variables and Secrets)
- `BREVO_API_KEY`: chave API do Brevo (a chave expira se não for usada durante 90 dias).
- `TURNSTILE_SECRET`: segredo do widget Turnstile.

## Verificar se está tudo ligado
`https://wakenbake.pt/api/estado` mostra só sim/não (chaves presentes, Brevo configurado, inscrições pendentes). Não mostra dados pessoais.

## Robôs e IA
AI Crawl Control da zona: nenhum robô bloqueado (27/11/2026). «Bot Preference Sync» ligado: depois de publicar, confirmar que o robots.txt servido não acrescenta sinais a recusar treino.

## Cookies e medição
Sem cookies de publicidade nem de estatística, por isso sem aviso de cookies (ao contrário do Cuidar dos Meus, que usa GA4, Ads e Clarity com Consent Mode).

Medição: Cloudflare Web Analytics (conta Cloudflare > Analytics > Web analytics > wakenbake.pt), ativado a 27/11/2026 em «Enable» (injeção automática, inclui visitantes da UE). Não usa cookies nem localStorage. A Cloudflare só injeta o script nas páginas servidas em wakenbake.pt, por isso o staging não conta e não há token no repositório (`SITE.estatistica` em `src/config.js` só liga o texto da privacidade). O CSP já permite `static.cloudflareinsights.com` e o envio para `/cdn-cgi/rum` (connect-src 'self'). Plano B, se a injeção não acontecer nas respostas do Worker: mudar para «Enable with JS Snippet installation» e pôr o token público em `SITE.analytics`.

Leitura: as visitas à /devfest são praticamente leituras do QR (a página não está no Google). No Brevo, o atributo ORIGEM separa inscrições devfest e site. O Turnstile só carrega quando a pessoa mexe no formulário. Se um dia entrar GA4 ou pixel da Meta, copiar o aviso de cookies do Cuidar dos Meus (recusado por defeito).
