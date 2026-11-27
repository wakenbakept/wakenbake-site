# Infraestrutura (sem chaves nem palavras-passe)

| Peça | Onde | Notas |
|---|---|---|
| Domínio wakenbake.pt | Hostinger (registo) | Servidores de nomes apontados para a Cloudflare (amir / connie.ns.cloudflare.com). |
| DNS, SSL, segurança | Cloudflare, conta da Wake n Bake (wakenbake.padaria@gmail.com), zona wakenbake.pt, plano Free | Always Use HTTPS ligado, TLS mínimo 1.2. HSTS curto no `_headers`; subir depois de estável. |
| Site e API | Cloudflare Worker `wakenbake-site` | Ficheiros estáticos (dist) + `/api/lista` e `/api/estado`. workers.dev desligado até à publicação. Pré-visualizações por ramo ligadas. |
| Código | GitHub `wakenbakept/wakenbake-site` (conta pessoal do António, organização wakenbakept) | Público. `main` protegido (pull request obrigatório, squash, sem force push). Secret scanning e push protection ligados. |
| Lista de espera | Brevo (plano Free), conta da Wake n Bake | Domínio autenticado (código Brevo, DKIM brevo1/brevo2, DMARC). Remetente ola@wakenbake.pt. O Worker cria sozinho a pasta «Wake n Bake», as listas «Lista de espera» e «Testes», os atributos e o email de confirmação. |
| Anti-robô | Cloudflare Turnstile, widget «Lista de espera wakenbake.pt» | Chave pública em `src/config.js`. Hostnames: wakenbake.pt e wakenbake-padaria.workers.dev. |
| Reserva de inscrições | Cloudflare KV `wnb-site-lista` (UE) | Se o Brevo falhar, a inscrição fica aqui até 30 dias e o Worker reenvia de 30 em 30 minutos. Também guarda a configuração do Brevo (`cfg:brevo`). |
| Email ola@wakenbake.pt | Cloudflare Email Routing → wakenbake.padaria@gmail.com | |

## Segredos do Worker (Settings → Variables and Secrets)
- `BREVO_API_KEY`: chave API do Brevo (a chave expira se não for usada durante 90 dias).
- `TURNSTILE_SECRET`: segredo do widget Turnstile.

## Verificar se está tudo ligado
`https://wakenbake.pt/api/estado` mostra só sim/não (chaves presentes, Brevo configurado, inscrições pendentes). Não mostra dados pessoais.
