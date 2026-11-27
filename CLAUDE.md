# Wake n Bake (wakenbake.pt): instruções para o Claude

Escrever para o utilizador em português europeu. Nos textos do site e nas mensagens: sem travessões (—).

## Antes de mexer
- `docs/infra.md`: contas, DNS, Worker, Brevo, Turnstile e onde vivem as chaves (sem valores).
- Marca: design system da Wake n Bake (cores, tipografia, tom de voz). Fundo preto, osso, betão; Anton para títulos, Space Mono para texto e etiquetas, Bungee só no autocolante. Tom curto, seco, em minúsculas ou CAPS, sem emojis.
- `CHANGELOG.md`: o que mudou em cada publicação.

## Regras fixas
- Nada vai para o ar sem o António ver e aprovar. Trabalhar num ramo, abrir pull request; o `main` é o site real.
- `npm run verificar` antes de qualquer pull request.
- Nunca pôr segredos no repositório. `BREVO_API_KEY` e `TURNSTILE_SECRET` vivem só nos Secrets do Worker. O Claude nunca escreve nem vê chaves: abre o campo certo e o António cola.
- O repositório é público: nada de dados de clientes, emails de pessoas, receitas, fichas técnicas ou preços de custo.
- Robôs: alcance máximo em pesquisa e IA; bloquear só robôs abusivos. Na Cloudflare, nunca usar a definição global «Training: Block».
- Fase atual: página «em breve» com lista de espera, sem preços nem encomendas.
