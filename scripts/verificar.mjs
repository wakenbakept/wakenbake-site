// Verificação antes de qualquer pull request: corre depois do build (npm run verificar).
// Confirma ficheiros obrigatórios, canónicos, noindex, scripts embutidos, links internos e fugas de segredos.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const erros = [];
const erro = (m) => erros.push(m);

const obrigatorios = ['index.html', 'devfest.html', 'privacidade.html', 'confirmado.html', '404.html', 'robots.txt', 'sitemap.xml', '_headers', '.well-known/security.txt'];
for (const f of obrigatorios) if (!existsSync(join(DIST, f))) erro(`falta ${f}`);

const semIndexar = new Set(['devfest.html', 'confirmado.html', '404.html']);
const todos = [];
const andar = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? andar(p) : todos.push(p); });
andar(DIST);

const html = todos.filter((p) => extname(p) === '.html');
for (const p of html) {
  const nome = p.slice(DIST.length + 1);
  const s = readFileSync(p, 'utf8');
  if (!/<html lang="pt-PT">/.test(s)) erro(`${nome}: falta lang pt-PT`);
  if (!/<link rel="canonical" href="https:\/\/wakenbake\.pt[^"]*">/.test(s)) erro(`${nome}: falta canónico`);
  const noindex = /<meta name="robots" content="noindex/.test(s);
  if (semIndexar.has(nome) && !noindex) erro(`${nome}: devia ter noindex`);
  if (!semIndexar.has(nome) && noindex) erro(`${nome}: não devia ter noindex`);
  for (const m of s.matchAll(/<script\b([^>]*)>/g)) if (!/\bsrc=/.test(m[1])) erro(`${nome}: script embutido (a CSP bloqueia)`);
  if (/—/.test(s)) erro(`${nome}: tem travessão (—)`);
  // Imagens e ficheiros do próprio site que a página pede (src, og:image, ícones) têm de existir.
  for (const m of s.matchAll(/(?:src|content|href)="(?:https:\/\/wakenbake\.pt)?(\/[^"#?]*\.(?:png|svg|jpg|webp|ico|woff2))"/g)) {
    if (!existsSync(join(DIST, m[1]))) erro(`${nome}: ficheiro em falta ${m[1]}`);
  }
  for (const m of s.matchAll(/href="(\/[^"#?]*)/g)) {
    const alvo = m[1];
    const candidatos = [alvo, `${alvo}.html`, join(alvo, 'index.html')].map((c) => join(DIST, c));
    if (alvo !== '/' && !candidatos.some((c) => existsSync(c))) erro(`${nome}: link interno partido ${alvo}`);
  }
}

// Nada de segredos no que vai para o ar.
const PADROES = [/xkeysib-[a-z0-9]{20,}/i, /xsmtpsib-[a-z0-9]{20,}/i, /BREVO_API_KEY\s*[=:]\s*\S{10,}/, /TURNSTILE_SECRET\s*[=:]\s*\S{10,}/];
for (const p of todos) {
  if (!['.html', '.js', '.css', '.txt', '.xml', '.json', ''].includes(extname(p))) continue;
  const s = readFileSync(p, 'utf8');
  if (PADROES.some((r) => r.test(s))) erro(`${p}: parece ter um segredo`);
}

const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
if (/devfest|confirmado/.test(sitemap)) erro('sitemap.xml: não deve listar páginas noindex');

if (erros.length) {
  console.error(`✗ ${erros.length} problema(s):\n- ${erros.join('\n- ')}`);
  process.exit(1);
}
console.log(`✓ verificação ok (${html.length} páginas)`);
