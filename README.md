# wakenbake-site

Site da Wake n Bake (wakenbake.pt) · massa (mãe) clandestina · Faro.

Astro estático servido por um Cloudflare Worker (`wakenbake-site`, conta da Wake n Bake). O Worker trata também da lista de espera (`/api/lista`): verificação anti-robô com Turnstile e inscrição com confirmação por email (double opt-in) no Brevo.

## Comandos

```sh
npm ci
npm run dev        # pré-visualização com recarga (só as páginas)
npm run verificar  # gera o site e corre as verificações (obrigatório antes de um pull request)
npm run preview    # gera e corre o Worker em local (páginas + /api)
```

Em local, o `.dev.vars` (nunca vai para o repositório) pode ter `TURNSTILE_SECRET=1x0000000000000000000000000000000AA`, a chave de teste da Cloudflare.

## Como se publica

1. Trabalho num ramo e pull request. A verificação corre sozinha no GitHub.
2. O António revê e aprova. Só depois entra no `main`.
3. O `main` é o site real (Workers Builds da Cloudflare).

Infraestrutura, contas e onde vivem as chaves: `docs/infra.md`. Regras para quem mexe no código (pessoas ou Claude): `CLAUDE.md`.
