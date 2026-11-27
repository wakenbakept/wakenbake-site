// Worker do site wakenbake.pt.
// Serve o site estático (pasta dist, via ASSETS) e trata da lista de espera em /api/lista.
// Segredos (só nos Secrets do Worker, nunca no repositório): BREVO_API_KEY, TURNSTILE_SECRET.

const BREVO = 'https://api.brevo.com/v3';
const CFG_VERSAO = 2; // subir quando mudar o que o setup cria no Brevo
const NOMES = {
  pasta: 'Wake n Bake',
  lista: 'Lista de espera',
  testes: 'Testes',
  template: 'WNB · confirmar lista de espera',
};
const PENDENTE_TTL = 60 * 60 * 24 * 30; // 30 dias
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const NOME_RE = /^[\p{L}\p{M}' .-]{2,40}$/u;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // www → domínio principal
    if (url.hostname === 'www.wakenbake.pt') {
      url.hostname = 'wakenbake.pt';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/api/lista') {
      try {
        return await lista(request, env, ctx, url);
      } catch (e) {
        console.error('lista', String(e && e.message || e));
        return json({ ok: false, erro: 'geral' }, 500);
      }
    }
    if (url.pathname === '/api/estado') return estado(env);
    if (url.pathname.startsWith('/api/')) return json({ ok: false, erro: 'nao-existe' }, 404);

    const resposta = await env.ASSETS.fetch(request);
    if (producao(env, url.hostname)) return resposta;
    // Pré-visualizações e endereços workers.dev: fora dos motores de busca.
    const r = new Response(resposta.body, resposta);
    r.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return r;
  },

  // De 30 em 30 minutos: reenvia para o Brevo inscrições que ficaram guardadas quando o Brevo falhou.
  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(reenviarPendentes(env));
  },
};

// ---------- lista de espera ----------

async function lista(request, env, ctx, url) {
  if (request.method !== 'POST') return json({ ok: false, erro: 'metodo' }, 405, { Allow: 'POST' });

  const origem = request.headers.get('Origin');
  if (!origem || new URL(origem).host !== url.host) return json({ ok: false, erro: 'origem' }, 403);
  if (!(request.headers.get('content-type') || '').includes('application/json')) return json({ ok: false, erro: 'dados' }, 415);

  const texto = await request.text();
  if (texto.length > 4096) return json({ ok: false, erro: 'dados' }, 413);
  let d;
  try { d = JSON.parse(texto); } catch { return json({ ok: false, erro: 'dados' }, 400); }

  // Armadilha para robôs: campo escondido preenchido = finge que correu bem e não guarda nada.
  if (d.site) return json({ ok: true });

  const email = String(d.email || '').trim().toLowerCase();
  const nome = String(d.nome || '').trim().replace(/\s+/g, ' ');
  const origemPagina = ['devfest', 'site'].includes(d.origem) ? d.origem : 'site';
  const pagina = String(d.pagina || '').slice(0, 60).replace(/[^a-z0-9/_-]/gi, '');

  if (!EMAIL_RE.test(email) || email.length > 120) return json({ ok: false, erro: 'dados' }, 400);
  if (nome.length < 2 || !NOME_RE.test(nome)) return json({ ok: false, erro: 'nome' }, 400);
  if (d.consentimento !== true) return json({ ok: false, erro: 'consentimento' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await turnstileOk(env, d.turnstile, ip, url.hostname))) return json({ ok: false, erro: 'anti-spam' }, 403);

  const inscricao = {
    email,
    nome,
    origem: origemPagina,
    pagina,
    consentimento: env.CONSENTIMENTO_VERSAO,
    data: new Date().toISOString(),
    teste: !producao(env, url.hostname),
    regresso: `${url.origin}/confirmado`,
  };

  try {
    await enviarBrevo(env, inscricao);
  } catch (e) {
    // O Brevo falhou: guarda para reenviar depois. A pessoa não perde a inscrição.
    console.error('brevo', String(e && e.message || e));
    await env.LISTA_KV.put(`pendente:${Date.now()}:${crypto.randomUUID()}`, JSON.stringify(inscricao), { expirationTtl: PENDENTE_TTL });
  }
  return json({ ok: true });
}

async function turnstileOk(env, token, ip, hostname) {
  if (!env.TURNSTILE_SECRET) return false;
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  // Desenvolvimento local com a chave de teste da Cloudflare (que aceita sempre): não sai para a rede.
  if (env.TURNSTILE_SECRET.startsWith('1x000000') && ['localhost', '127.0.0.1'].includes(hostname)) return true;
  const corpo = new FormData();
  corpo.append('secret', env.TURNSTILE_SECRET);
  corpo.append('response', token);
  if (ip) corpo.append('remoteip', ip);
  let j = {};
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: corpo });
    j = await r.json();
  } catch (e) {
    console.error('turnstile', String(e && e.message || e));
    return false;
  }
  if (!j.success) return false;
  if (j.action && j.action !== 'lista') return false;
  // O token tem de ter sido emitido para este mesmo domínio (ou um subdomínio de workers.dev deste Worker).
  return !j.hostname || j.hostname === hostname;
}

function producao(env, hostname) {
  return String(env.DOMINIOS_PRODUCAO || '').split(',').map((s) => s.trim()).includes(hostname);
}

// ---------- Brevo ----------

async function brevo(env, caminho, opcoes = {}) {
  if (!env.BREVO_API_KEY) throw new Error('sem BREVO_API_KEY');
  const r = await fetch(`${BREVO}${caminho}`, {
    ...opcoes,
    headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json', 'content-type': 'application/json', ...(opcoes.headers || {}) },
  });
  const texto = await r.text();
  let corpo = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
  if (!r.ok) {
    const msg = corpo && corpo.message ? corpo.message : texto;
    const err = new Error(`${opcoes.method || 'GET'} ${caminho} → ${r.status} ${String(msg).slice(0, 200)}`);
    err.status = r.status;
    err.code = corpo && corpo.code;
    throw err;
  }
  return corpo;
}

async function enviarBrevo(env, ins) {
  const cfg = await configBrevo(env);
  const atributos = {
    ORIGEM: ins.origem,
    PAGINA: ins.pagina,
    CONSENTIMENTO_VERSAO: ins.consentimento,
    CONSENTIMENTO_DATA: ins.data.slice(0, 10),
  };
  atributos[cfg.nomeAtributo] = ins.nome;
  await brevo(env, '/contacts/doubleOptinConfirmation', {
    method: 'POST',
    body: JSON.stringify({
      email: ins.email,
      includeListIds: [ins.teste ? cfg.testes : cfg.lista],
      templateId: cfg.template,
      redirectionUrl: ins.regresso,
      attributes: atributos,
    }),
  });
}

// O Worker monta sozinho o que precisa no Brevo (pasta, listas, atributos, remetente e email de confirmação)
// e guarda os IDs no KV. Assim não há IDs escritos à mão no código.
async function configBrevo(env) {
  const guardada = await env.LISTA_KV.get('cfg:brevo', 'json');
  if (guardada && guardada.versao === CFG_VERSAO) return guardada;

  try {
    const cfg = { versao: CFG_VERSAO };

    const pastas = await brevo(env, '/contacts/folders?limit=50&offset=0');
    let pasta = (pastas.folders || []).find((p) => p.name === NOMES.pasta);
    if (!pasta) pasta = await brevo(env, '/contacts/folders', { method: 'POST', body: JSON.stringify({ name: NOMES.pasta }) });
    cfg.pasta = pasta.id;

    const listas = await brevo(env, '/contacts/lists?limit=50&offset=0');
    const achar = async (nome) => {
      const l = (listas.lists || []).find((x) => x.name === nome);
      if (l) return l.id;
      const nova = await brevo(env, '/contacts/lists', { method: 'POST', body: JSON.stringify({ name: nome, folderId: cfg.pasta }) });
      return nova.id;
    };
    cfg.lista = await achar(NOMES.lista);
    cfg.testes = await achar(NOMES.testes);

    const attrs = await brevo(env, '/contacts/attributes');
    const normais = new Set((attrs.attributes || []).filter((a) => a.category === 'normal').map((a) => a.name));
    cfg.nomeAtributo = ['FIRSTNAME', 'NOME', 'PRENOME', 'PRIMEIRO_NOME'].find((n) => normais.has(n)) || 'FIRSTNAME';
    const precisa = [
      [cfg.nomeAtributo, 'text'],
      ['ORIGEM', 'text'],
      ['PAGINA', 'text'],
      ['CONSENTIMENTO_VERSAO', 'text'],
      ['CONSENTIMENTO_DATA', 'date'],
    ];
    for (const [nome, tipo] of precisa) {
      if (!normais.has(nome)) {
        await brevo(env, `/contacts/attributes/normal/${nome}`, { method: 'POST', body: JSON.stringify({ type: tipo }) });
      }
    }

    // Remetente ola@wakenbake.pt (o domínio já está autenticado no Brevo, por isso fica validado).
    // Se falhar aqui, o erro aparece a seguir, ao gravar o email de confirmação.
    try {
      const remetentes = await brevo(env, '/senders');
      if (!(remetentes.senders || []).some((s) => String(s.email).toLowerCase() === env.BREVO_REMETENTE)) {
        await brevo(env, '/senders', { method: 'POST', body: JSON.stringify({ name: env.BREVO_REMETENTE_NOME, email: env.BREVO_REMETENTE }) });
      }
    } catch (e) {
      console.error('remetente', String(e && e.message || e));
    }

    const modelos = await brevo(env, '/smtp/templates?templateStatus=true&limit=100&offset=0');
    const existente = (modelos.templates || []).find((t) => t.name === NOMES.template);
    const modelo = {
      templateName: NOMES.template,
      subject: 'confirma e entras na lista',
      sender: { name: env.BREVO_REMETENTE_NOME, email: env.BREVO_REMETENTE },
      replyTo: env.BREVO_REMETENTE,
      htmlContent: emailConfirmacao(),
      isActive: true,
      tag: 'optin',
    };
    if (existente) {
      await brevo(env, `/smtp/templates/${existente.id}`, { method: 'PUT', body: JSON.stringify(modelo) });
      cfg.template = existente.id;
    } else {
      const novo = await brevo(env, '/smtp/templates', { method: 'POST', body: JSON.stringify(modelo) });
      cfg.template = novo.id;
    }

    cfg.feito = new Date().toISOString();
    await env.LISTA_KV.put('cfg:brevo', JSON.stringify(cfg));
    await env.LISTA_KV.delete('cfg:erro');
    return cfg;
  } catch (e) {
    await env.LISTA_KV.put('cfg:erro', JSON.stringify({ quando: new Date().toISOString(), erro: String(e.message || e).slice(0, 300) }));
    throw e;
  }
}

async function reenviarPendentes(env) {
  const { keys } = await env.LISTA_KV.list({ prefix: 'pendente:', limit: 50 });
  for (const k of keys) {
    const ins = await env.LISTA_KV.get(k.name, 'json');
    if (!ins) continue;
    try {
      await enviarBrevo(env, ins);
      await env.LISTA_KV.delete(k.name);
    } catch (e) {
      console.error('reenvio', String(e && e.message || e));
      return; // o Brevo continua em baixo: tenta na próxima volta
    }
  }
}

// Estado sem dados pessoais nem segredos: serve para confirmar que está tudo ligado.
async function estado(env) {
  const [cfg, erro, pend] = await Promise.all([
    env.LISTA_KV.get('cfg:brevo', 'json'),
    env.LISTA_KV.get('cfg:erro', 'json'),
    env.LISTA_KV.list({ prefix: 'pendente:', limit: 100 }),
  ]);
  return json({
    brevoChave: Boolean(env.BREVO_API_KEY),
    turnstileSegredo: Boolean(env.TURNSTILE_SECRET),
    brevoConfigurado: Boolean(cfg && cfg.versao === CFG_VERSAO),
    ultimoErroSetup: erro ? erro.quando : null,
    pendentes: pend.keys.length,
  });
}

// ---------- utilidades ----------

function json(dados, status = 200, extra = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-robots-tag': 'noindex',
      ...extra,
    },
  });
}

// Email de confirmação (double opt-in). {{ doubleoptin }} é o link que o Brevo gera.
function emailConfirmacao() {
  const osso = '#F4F2ED';
  const preto = '#0A0A0A';
  const betao = '#9A958C';
  const mono = "'Space Mono', 'Courier New', Courier, monospace";
  const display = "Anton, Impact, 'Arial Narrow', sans-serif";
  return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>confirma e entras na lista</title></head>
<body style="margin:0;padding:0;background:${preto};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${preto};">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
<tr><td style="padding-bottom:36px;"><img src="https://wakenbake.pt/img/email-logo.png" width="180" alt="WAKE N BAKE" style="display:block;border:0;width:180px;height:auto;color:${osso};font-family:${display};font-size:28px;"></td></tr>
<tr><td style="font-family:${mono};font-size:12px;letter-spacing:3px;color:${betao};padding-bottom:14px;">LISTA DE ESPERA</td></tr>
<tr><td style="font-family:${display};font-size:44px;line-height:1;color:${osso};padding-bottom:22px;">FALTA UM CLIQUE.</td></tr>
<tr><td style="font-family:${mono};font-size:14px;line-height:1.8;color:${osso};padding-bottom:30px;">confirma o teu email e ficas na lista da wake n bake. avisamos quando há fornada e quando o site abre.</td></tr>
<tr><td style="padding-bottom:30px;"><a href="{{ doubleoptin }}" style="display:inline-block;background:${osso};color:${preto};font-family:${display};font-size:20px;letter-spacing:1px;text-decoration:none;padding:16px 34px;">CONFIRMAR</a></td></tr>
<tr><td style="font-family:${mono};font-size:12px;line-height:1.8;color:${betao};border-top:1px dashed #4A4A4A;padding-top:22px;">não foste tu? ignora este email. sem confirmação não entras na lista.<br>massa (mãe) clandestina · faro · <a href="https://wakenbake.pt/privacidade" style="color:${betao};">privacidade</a></td></tr>
</table></td></tr></table></body></html>`;
}
