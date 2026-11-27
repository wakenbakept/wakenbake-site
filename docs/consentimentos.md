# Versões do consentimento da lista de espera

O Worker grava em cada contacto do Brevo o atributo `CONSENTIMENTO_VERSAO` (variável `CONSENTIMENTO_VERSAO` em `wrangler.jsonc`) e a data (`CONSENTIMENTO_DATA`), mais a página de origem (`ORIGEM`, `PAGINA`). Se o texto da caixa mudar, cria-se uma versão nova aqui e no `wrangler.jsonc`.

| Versão | Texto da caixa | Onde |
|---|---|---|
| 2026-11-27 | quero receber os avisos de fornada e as novidades da wake n bake por email. saio quando quiser. (link: privacidade) | / e /devfest |

Confirmação: double opt-in do Brevo. Sem clicar em «CONFIRMAR» no email, o contacto não entra na lista.
