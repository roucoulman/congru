(() => {
'use strict';

/* ================= Utilitaires ================= */
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[rand(0, arr.length - 1)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ip2int = s => s.split('.').reduce((acc, o) => acc * 256 + parseInt(o, 10), 0);
const int2ip = n => [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.');
const maskFromPrefix = p => (p === 0 ? 0 : ((0xFFFFFFFF << (32 - p)) >>> 0));
const netOf = (ip, mask) => ((ip & mask) >>> 0);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

// Réseau "classful" aléatoire (A: /8, B: /16, C: /24)
function randClassNet(used) {
  let cls, first;
  do {
    const r = Math.random();
    cls = r < 0.2 ? 'A' : r < 0.55 ? 'B' : 'C';
    first = cls === 'A' ? rand(1, 126) : cls === 'B' ? rand(128, 191) : rand(192, 223);
  } while (first === 10 || first === 127 || used.has(first));
  used.add(first);
  const prefix = cls === 'A' ? 8 : cls === 'B' ? 16 : 24;
  const parts = [first, cls === 'A' ? 0 : rand(1, 254), cls === 'C' ? rand(1, 254) : 0, 0];
  const base = ip2int(parts.join('.'));
  return { cls, prefix, size: 2 ** (32 - prefix), base, addr: int2ip(base) };
}
function randHost(net) {
  let ip;
  do { ip = net.base + rand(1, net.size - 2); } while (ip % 256 === 0 || ip % 256 === 255);
  return ip;
}
// /24 aléatoire de classe B ou C
function rand24(used) {
  let first;
  do { first = Math.random() < 0.5 ? rand(128, 191) : rand(192, 223); } while (used.has(first));
  used.add(first);
  return ip2int(`${first}.${rand(0, 255)}.${rand(0, 255)}.0`);
}

/* ================= État ================= */
const state = { page: 'ex2', diff: 'facile', sub: 'exo' };
const scores = { ex2: [0, 0], ex3: [0, 0], ex4: [0, 0] };
let q = null, answered = false;

/* ================= Styles ================= */
const css = document.createElement('style');
css.textContent = `
  *{box-sizing:border-box}
  body{margin:0;padding:16px;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111827}
  .game{width:100%;max-width:560px;padding:20px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;box-shadow:0 10px 15px -3px rgba(0,0,0,.05)}
  .row{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:10px}
  button{cursor:pointer;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#374151;font-weight:500;font-size:12px;padding:8px 10px;transition:all .15s;outline:none;-webkit-tap-highlight-color:transparent}
  button.on{background:#4f46e5;color:#fff;border-color:#4f46e5}
  button.d.on{background:#e0e7ff;color:#3730a3;border-color:#c7d2fe;font-weight:600}
  button.main{width:100%;padding:12px;font-size:14px;background:#4f46e5;color:#fff;border-color:#4f46e5;margin-top:14px}
  .score{font-size:13px;color:#6b7280;text-align:center;margin:4px 0 14px;font-weight:500}
  .statement{font-size:14px;line-height:1.5;margin:8px 0}
  .small{font-size:12px;color:#6b7280;line-height:1.4}
  ul.ifaces{margin:6px 0;padding-left:18px;font-size:13px;line-height:1.6}
  code,.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}
  label.dest{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;margin:6px 0;font-size:14px;cursor:pointer}
  label.dest input{width:18px;height:18px}
  input[type=text],input[type=number]{padding:9px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:14px;outline:none;width:100%}
  input.good{background:#f0fdf4;border-color:#86efac}
  input.bad{background:#fef2f2;border-color:#fca5a5}
  table.rt{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}
  table.rt th,table.rt td{border:1px solid #e5e7eb;padding:6px;text-align:center}
  table.rt th{background:#f3f4f6;font-weight:600}
  .chain{display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:center;margin:8px 0;font-size:12px}
  .node{border:1.5px solid #6366f1;border-radius:999px;padding:3px 10px;background:#eef2ff;font-weight:600}
  .link{color:#6b7280;font-weight:600}
  .detail{font-size:12.5px;line-height:1.7;margin:6px 0;color:#374151}
  .net{border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;margin:6px 0;background:#fafafa;font-size:13px}
  .nt{margin-bottom:4px}
  .tag{font-size:10px;background:#fde68a;color:#78350f;padding:1px 6px;border-radius:999px;font-weight:600}
  .chip{display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:6px;background:#e0e7ff;color:#3730a3;font-size:12px}
  .chip.st{background:#dcfce7;color:#166534}
  .feedback{margin-top:14px;padding:10px 14px;border-radius:8px;font-size:13px;line-height:1.5;text-align:left}
  .feedback.ok{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .feedback.ko{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
  .res{margin:4px 0;font-size:12.5px}
  .res small{display:block;color:#6b7280;margin-left:16px}
  .msg{color:#b45309;font-size:12px;min-height:16px;margin-top:6px;text-align:center}
  @media (max-width:480px){.game{padding:14px 12px;border-radius:12px}button{font-size:11px;padding:6px 7px}}
`;
document.head.appendChild(css);

/* ================= PAGE 1 : Masques (Ex 2) + Automatisme (Ex 1) ================= */
function genAuto(diff) {
  const b = pick(diff === 'facile' ? [2, 3, 4] : [2, 3, 4, 5, 6, 7]);
  const subnets = 2 ** b, stations = 2 ** (8 - b) - 2, lost = 254 - subnets * stations, mask = 256 - 2 ** (8 - b);
  const types = diff === 'facile' ? ['subnets', 'stations'] : diff === 'moyen' ? ['subnets', 'stations', 'lost'] : ['subnets', 'stations', 'lost', 'mask'];
  const t = pick(types);
  const map = {
    subnets: { v: subnets, text: `Classe C : avec ${b} bits de subnet, quel est le nombre max de sous-réseaux ?`, how: `2^${b} = ${subnets}` },
    stations: { v: stations, text: `Classe C : avec ${b} bits de subnet, quel est le nombre max de stations par sous-réseau ?`, how: `2^${8 - b} − 2 = ${stations}` },
    lost: { v: lost, text: `Classe C : avec ${b} bits de subnet, quel est le nombre total d'adresses de stations perdues ?`, how: `254 − ${subnets} × ${stations} = ${lost}` },
    mask: { v: mask, text: `Classe C : avec ${b} bits de subnet, quel est le dernier octet du masque (255.255.255.?) ?`, how: `256 − 2^${8 - b} = ${mask}` }
  };
  return { kind: 'auto', ...map[t] };
}

function genMasks(diff) {
  const used = new Set();
  const ifaces = [];
  const shared = [];
  const add = (net, prefix) => {
    const size = 2 ** (32 - prefix);
    const f = { net, prefix, size, mask: maskFromPrefix(prefix), ip: net + rand(1, size - 2) };
    ifaces.push(f);
    return f;
  };
  // 2 interfaces dans le même /24 (ex : 154.15.101.X) : il faut faire le ET avec le masque
  const addShared = (prefixes) => {
    const base = rand24(used);
    const p = pick(prefixes), blocks = 2 ** (32 - p), count = 256 / blocks;
    shuffle([...Array(count).keys()]).slice(0, 2).forEach(k => shared.push(add(base + k * blocks, p)));
  };
  if (diff === 'facile') {
    add(rand24(used), 24); addShared([26, 27]); add(rand24(used), 24);
  } else if (diff === 'moyen') {
    add(rand24(used), 24); add(rand24(used), 24); addShared([26, 27, 28]);
  } else {
    add(rand24(used), 24); addShared([27, 28, 29]);
    const pB = pick([20, 21, 22]), step = 2 ** (24 - pB);
    let first; do { first = rand(128, 191); } while (used.has(first)); used.add(first);
    add(ip2int(`${first}.${rand(0, 255)}.${step * rand(0, 256 / step - 1)}.0`), pB);
  }
  const inside = ip => ifaces.findIndex(f => netOf(ip, f.mask) === f.net);
  const N = diff === 'difficile' ? 7 : 6, nAcc = rand(2, N - 3);
  const dests = new Set();
  let guard = 0;
  while (dests.size < N && guard++ < 1000) {
    const f = Math.random() < 0.7 ? pick(shared) : pick(ifaces); let cand;
    if (dests.size < nAcc) {
      cand = f.net + rand(1, f.size - 2);
    } else {
      const t = Math.random();
      if (t < 0.65) cand = f.net + pick([-2, -1, 1, 2]) * f.size + rand(1, f.size - 2);
      else { const p = int2ip(f.net).split('.'); cand = ip2int(`${p[0]}.${rand(0, 255)}.${p[2]}.${rand(1, 254)}`); }
      if (cand < 0 || cand > 0xFFFFFFFF || inside(cand) !== -1) continue;
    }
    dests.add(cand);
  }
  const list = shuffle([...dests]);
  return { kind: 'exo', ifaces, dests: list, expect: list.map(d => inside(d) !== -1), where: list.map(inside), showNet: diff !== 'difficile' };
}

const page1 = {
  label: '1 · Masques',
  generate: diff => (state.sub === 'auto' ? genAuto(diff) : genMasks(diff)),
  build(qq, root) {
    if (qq.kind === 'auto') {
      root.innerHTML = `<p class="statement">${qq.text}</p><input type="number" id="auto" placeholder="Valeur…" style="text-align:center;max-width:180px;display:block;margin:10px auto">`;
      return;
    }
    const lis = qq.ifaces.map((f, i) =>
      `<li>Interface ${i + 1} : adresse <b>${int2ip(f.ip)}</b>${qq.showNet ? ` pour le réseau <b>${int2ip(f.net)}</b>` : ''} et de masque <b>${int2ip(f.mask)}</b></li>`).join('');
    const boxes = qq.dests.map((d, i) => `<label class="dest"><input type="checkbox" data-i="${i}"><span>${i + 1}. <code>${int2ip(d)}</code></span></label>`).join('');
    root.innerHTML = `<p class="statement">Soit un routeur connecté à ${qq.ifaces.length} réseaux par l'intermédiaire de ${qq.ifaces.length} interfaces :</p><ul class="ifaces">${lis}</ul>
      <p class="statement">Parmi les destinations suivantes, lesquelles lui sont <b>directement accessibles</b> ?</p>${boxes}`;
  },
  check(qq, root) {
    if (qq.kind === 'auto') {
      const inp = root.querySelector('#auto');
      if (inp.value.trim() === '') return null;
      const ok = parseInt(inp.value, 10) === qq.v;
      return { ok, html: ok ? ` (${qq.how})` : ` La valeur attendue était <b>${qq.v}</b> (${qq.how}).` };
    }
    let allOk = true;
    const rows = qq.dests.map((d, i) => {
      const chk = root.querySelector(`input[data-i="${i}"]`).checked;
      const good = chk === qq.expect[i];
      if (!good) allOk = false;
      let why;
      if (qq.expect[i]) {
        const f = qq.ifaces[qq.where[i]];
        why = `${int2ip(d)} ET ${int2ip(f.mask)} = ${int2ip(f.net)} → réseau de l'interface ${qq.where[i] + 1}`;
      } else {
        why = qq.ifaces.map((f, k) => `I${k + 1} : ${int2ip(netOf(d, f.mask))}`).join(' · ') + ' → aucun ne correspond à un réseau de l\'interface';
      }
      return `<div class="res">${good ? '✓' : '✗'} <code>${int2ip(d)}</code> : ${qq.expect[i] ? 'accessible' : 'non accessible'}<small>${why}</small></div>`;
    }).join('');
    return { ok: allOk, html: `<div style="margin-top:8px">${rows}</div>` };
  }
};

/* ================= PAGE 2 : Routage IP (Ex 3) ================= */
function genRouting(diff) {
  const n = diff === 'facile' ? 3 : diff === 'moyen' ? 4 : 5;
  const used = new Set();
  const nets = []; for (let i = 0; i < n; i++) nets.push(randClassNet(used));
  const taken = nets.map(() => new Set());
  const host = k => { let ip; do { ip = randHost(nets[k]); } while (taken[k].has(ip)); taken[k].add(ip); return ip; };
  const routers = []; for (let i = 0; i < n - 1; i++) routers.push({ num: i + 1, a: host(i), b: host(i + 1) }); // a sur réseau i, b sur réseau i+1
  const stNets = new Set([0, n - 1]); if (n > 3) stNets.add(rand(1, n - 2));
  const stations = [...stNets].sort((x, y) => x - y).map(k => ({ net: k, ip: host(k) }));
  const devs = [...stations.map(s => ({ type: 'station', st: s })), ...routers.map((r, i) => ({ type: 'router', idx: i }))];
  const dev = pick(devs);
  const rows = nets.map((net, j) => {
    let gw;
    if (dev.type === 'station') {
      const k = dev.st.net;
      gw = j === k ? 0 : j < k ? routers[k - 1].b : routers[k].a;
    } else {
      const i = dev.idx;
      gw = (j === i || j === i + 1) ? 0 : j < i ? routers[i - 1].b : routers[i + 1].a;
    }
    return { label: net.addr, gw: gw === 0 ? '0.0.0.0' : int2ip(gw) };
  });
  const label = dev.type === 'station' ? `station ${int2ip(dev.st.ip)}` : `routeur R${dev.idx + 1}`;
  return { nets, routers, stations, rows, label };
}

const page2 = {
  label: '2 · Routage',
  generate: genRouting,
  build(qq, root) {
    const parts = [];
    qq.nets.forEach((n, i) => {
      parts.push(`<span class="node">${n.addr}</span>`);
      if (i < qq.routers.length) parts.push(`<span class="link">— R${i + 1} —</span>`);
    });
    const det = qq.routers.map((r, i) => `Routeur R${r.num} : <b>${int2ip(r.a)}</b> (sur ${qq.nets[i].addr}) · <b>${int2ip(r.b)}</b> (sur ${qq.nets[i + 1].addr})`)
      .concat(qq.stations.map(s => `Station <b>${int2ip(s.ip)}</b> sur ${qq.nets[s.net].addr}`)).join('<br>');
    const rows = qq.rows.map((r, i) => `<tr><td><input type="text" data-r="${i}" placeholder="réseau" autocomplete="off"></td><td><input type="text" data-g="${i}" placeholder="gateway" autocomplete="off"></td></tr>`).join('');
    root.innerHTML = `<p class="statement">On considère le réseau suivant.</p><div class="chain">${parts.join('')}</div><div class="detail">${det}</div>
      <p class="statement">Compléter la table de routage de : <b>${qq.label}</b> (${qq.rows.length} lignes, ordre libre)</p>
      <p class="small">Rappel : sous Linux, la route <code>0.0.0.0</code> correspond au réseau directement accessible (adjacent).</p>
      <table class="rt"><tr><th>réseau</th><th>gateway</th></tr>${rows}</table>`;
  },
  check(qq, root) {
    const inputs = [...root.querySelectorAll('input')];
    if (inputs.some(i => i.value.trim() === '')) return null;
    const usedRows = new Set();
    let allOk = true;
    qq.rows.forEach((_, i) => {
      const ni = root.querySelector(`input[data-r="${i}"]`), gi = root.querySelector(`input[data-g="${i}"]`);
      const k = qq.rows.findIndex((r, j) => !usedRows.has(j) && r.label === ni.value.trim());
      if (k !== -1) usedRows.add(k);
      const netOk = k !== -1;
      const gwOk = netOk && gi.value.trim() === qq.rows[k].gw;
      ni.classList.add(netOk ? 'good' : 'bad');
      gi.classList.add(gwOk ? 'good' : 'bad');
      if (!gwOk) allOk = false;
    });
    const sol = qq.rows.map(r => `<div class="res"><code>${r.label}</code> → <code>${r.gw}</code></div>`).join('');
    return { ok: allOk, html: allOk ? '' : `<div style="margin-top:6px">Table attendue :${sol}</div>` };
  }
};

/* ================= PAGE 3 : Réseau fédérateur (Ex 4) ================= */
function genBackbone(diff) {
  const K = diff === 'difficile' ? 4 : 3;
  const chain = diff === 'difficile';
  const used = new Set(); const nets = []; const routers = [];
  const mk = () => { const n = randClassNet(used); n.id = nets.length; n.members = []; n.station = null; nets.push(n); return n; };
  const attach = (r, n) => { const f = { router: r, net: n, ip: 0, preset: false }; r.ifaces.push(f); n.members.push(f); return f; };
  const R = i => routers[i - 1];
  const bb = mk();
  for (let i = 1; i <= K + 1; i++) routers.push({ num: i, ifaces: [] });
  for (let i = 1; i <= K; i++) attach(R(i), bb);
  for (let i = 1; i < K; i++) {
    const c = i === 1 ? rand(1, 2) : 1;
    for (let l = 0; l < c; l++) { const n = mk(); attach(R(i), n); n.bbOwner = i; }
  }
  const L = mk(); attach(R(K), L); attach(R(K + 1), L); L.bbOwner = K; L.isL = true;
  const M = mk(); attach(R(K + 1), M); M.bbOwner = K; M.isM = true;
  let s = 1;
  nets.forEach(n => { if (n !== bb) n.station = { name: 'S' + (s++), ip: n.base + 1 }; });
  // R1 est déjà configuré sur le réseau fédérateur
  const pre = R(1).ifaces[0]; pre.preset = true; pre.ip = bb.base + rand(2, bb.size - 12);
  nets.forEach(n => {
    let top = n.base + n.size - 2;
    n.members.slice().sort((a, b) => b.router.num - a.router.num).forEach(f => { if (!f.preset) f.ip = top--; });
  });
  const ifaceOf = (r, n) => r.ifaces.find(f => f.net === n);
  const ipS = f => int2ip(f.ip);

  const routerRows = r => {
    const n = r.num;
    const rows = nets.map(net => {
      let gw = '-';
      if (r.ifaces.some(f => f.net === net)) gw = '0.0.0.0';
      else if (n === 1) gw = ipS(ifaceOf(R(net.bbOwner), bb));
      else if (n === K && net.isM) gw = ipS(ifaceOf(R(K + 1), L));
      return { label: net.addr, gw };
    });
    let def = '-';
    if (n >= 2 && n <= K) def = ipS(ifaceOf(R(chain ? n - 1 : 1), bb));
    if (n === K + 1) def = ipS(ifaceOf(R(K), L));
    rows.push({ label: 'default', gw: def, isDef: true });
    return rows;
  };

  const types = diff === 'facile' ? ['A', 'B'] : diff === 'moyen' ? ['A', 'B', 'C', 'D', 'D'] : ['C', 'D', 'D', 'D'];
  const type = pick(types);
  const topo = { nets, routers, bb, K, chain };
  if (type === 'A') {
    const n = pick(nets.filter(x => x.station));
    return { topo, type, showAll: false, text: `Quelle est la plus petite adresse IP disponible pour la station <b>${n.station.name}</b> du réseau <b>${n.addr}</b> ?`, answer: int2ip(n.station.ip) };
  }
  if (type === 'B') {
    const cands = [];
    nets.forEach(n => n.members.forEach(f => { if (!f.preset) cands.push(f); }));
    const multi = cands.filter(f => f.net.members.length > 1);
    const f = (multi.length && Math.random() < 0.6) ? pick(multi) : pick(cands);
    return { topo, type, showAll: false, text: `Quelle adresse IP attribuer à l'interface de <b>R${f.router.num}</b> sur le réseau <b>${f.net.addr}</b> ?`, answer: int2ip(f.ip) };
  }
  if (type === 'C') {
    const n = pick(nets.filter(x => x.station && !x.isL));
    const gwIf = n.members[0];
    return { topo, type, showAll: true, text: `Écrire la table de routage de la station <b>${n.station.name}</b> (${int2ip(n.station.ip)}). Utiliser une route par défaut.`,
      rows: [{ label: `${n.addr} (réseau local)`, gw: '0.0.0.0' }, { label: 'default', gw: ipS(gwIf), isDef: true }] };
  }
  const r = pick(routers);
  return { topo, type: 'D', showAll: true, text: `Écrire la table de routage du routeur <b>R${r.num}</b>.`, rows: routerRows(r) };
}

const page3 = {
  label: '3 · Fédérateur',
  generate: genBackbone,
  build(qq, root) {
    const t = qq.topo;
    const netsHTML = t.nets.map(n => {
      const rs = n.members.slice().sort((a, b) => a.router.num - b.router.num)
        .map(f => `<span class="chip">R${f.router.num}${(qq.showAll || f.preset) ? ` · <b>${int2ip(f.ip)}</b>` : ''}</span>`).join('');
      const st = n.station ? `<span class="chip st">${n.station.name}${qq.showAll ? ` · <b>${int2ip(n.station.ip)}</b>` : ''}</span>` : '';
      return `<div class="net"><div class="nt"><b>${n.addr}</b>${n.id === 0 ? ' <span class="tag">fédérateur</span>' : ''}</div><div>${rs}${st}</div></div>`;
    }).join('');
    const note = (qq.type === 'A' || qq.type === 'B')
      ? `<p class="small">Stations : plus petite adresse disponible. Interfaces des nouveaux routeurs : plus grande adresse disponible ; si plusieurs routeurs sont sur un même réseau, la plus grande va au routeur de plus grand numéro. R1 est déjà configuré sur le réseau fédérateur.</p>`
      : `<p class="small">R1 connaît tout le réseau et n'utilise pas de route par défaut. Les autres routeurs ne connaissent que ce qui est de leur côté (directement connecté ou derrière eux) et utilisent une route par défaut vers ${t.chain ? 'le routeur de numéro précédent (R1 pour R2)' : 'R1'} ; le routeur R${t.K + 1} part par défaut vers R${t.K}. Écrire <code>-</code> si la destination est couverte par la route par défaut.</p>`;
    let ans;
    if (qq.type === 'A' || qq.type === 'B') {
      ans = `<input type="text" id="ip" placeholder="ex : 112.255.255.254" autocomplete="off">`;
    } else {
      const rows = qq.rows.map((r, i) => `<tr><td class="mono">${r.label}</td><td><input type="text" data-i="${i}" placeholder="${r.isDef ? 'gateway' : 'gateway ou -'}" autocomplete="off"></td></tr>`).join('');
      ans = `<table class="rt"><tr><th>réseau</th><th>gateway</th></tr>${rows}</table>`;
    }
    root.innerHTML = `<div>${netsHTML}</div>${note}<p class="statement">${qq.text}</p>${ans}`;
  },
  check(qq, root) {
    if (qq.type === 'A' || qq.type === 'B') {
      const inp = root.querySelector('#ip');
      if (inp.value.trim() === '') return null;
      const ok = inp.value.trim() === qq.answer;
      inp.classList.add(ok ? 'good' : 'bad');
      return { ok, html: ok ? '' : ` La bonne réponse était <code>${qq.answer}</code>.` };
    }
    const norm = v => { v = v.trim().toLowerCase(); return (v === '' || v === '-' || v === '–' || v === '—') ? '-' : v; };
    let allOk = true; const wrong = [];
    root.querySelectorAll('input').forEach((inp, i) => {
      const good = norm(inp.value) === qq.rows[i].gw;
      inp.classList.add(good ? 'good' : 'bad');
      if (!good) { allOk = false; wrong.push(`<div class="res">✗ <code>${qq.rows[i].label}</code> → <code>${qq.rows[i].gw}</code></div>`); }
    });
    return { ok: allOk, html: allOk ? '' : `<div style="margin-top:6px">Réponses attendues :${wrong.join('')}</div>` };
  }
};

const pages = { ex2: page1, ex3: page2, ex4: page3 };

/* ================= Interface ================= */
const container = el('div', 'game');
const tabs = el('div', 'row');
const subRow = el('div', 'row');
const diffRow = el('div', 'row');
const scoreP = el('p', 'score');
const stage = el('div');
const msg = el('div', 'msg');
const feedback = el('div', 'feedback'); feedback.style.display = 'none';
const btnMain = el('button', 'main', 'Valider');

const tabBtns = {};
Object.keys(pages).forEach(id => {
  const b = el('button', '', pages[id].label);
  b.addEventListener('click', () => { state.page = id; refreshUI(); nextQuestion(); });
  tabBtns[id] = b; tabs.appendChild(b);
});
const subBtns = {};
[['exo', 'Exercice (masques)'], ['auto', 'Automatisme (Ex 1)']].forEach(([id, label]) => {
  const b = el('button', '', label);
  b.addEventListener('click', () => { state.sub = id; refreshUI(); nextQuestion(); });
  subBtns[id] = b; subRow.appendChild(b);
});
const diffBtns = {};
[['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']].forEach(([id, label]) => {
  const b = el('button', 'd', label);
  b.addEventListener('click', () => { state.diff = id; refreshUI(); nextQuestion(); });
  diffBtns[id] = b; diffRow.appendChild(b);
});

[tabs, subRow, diffRow, scoreP, stage, msg, feedback, btnMain].forEach(e => container.appendChild(e));
document.body.appendChild(container);

function refreshUI() {
  Object.keys(tabBtns).forEach(id => tabBtns[id].classList.toggle('on', id === state.page));
  Object.keys(subBtns).forEach(id => subBtns[id].classList.toggle('on', id === state.sub));
  Object.keys(diffBtns).forEach(id => diffBtns[id].classList.toggle('on', id === state.diff));
  subRow.style.display = state.page === 'ex2' ? 'flex' : 'none';
  updateScore();
}
function updateScore() {
  const [c, t] = scores[state.page];
  scoreP.textContent = `Score : ${c} / ${t}`;
}
function nextQuestion() {
  const p = pages[state.page];
  q = p.generate(state.diff);
  answered = false;
  stage.innerHTML = '';
  p.build(q, stage);
  feedback.style.display = 'none';
  msg.textContent = '';
  btnMain.textContent = 'Valider';
  updateScore();
  const first = stage.querySelector('input[type=text],input[type=number]');
  if (first) first.focus();
}
btnMain.addEventListener('click', () => {
  if (answered) { nextQuestion(); return; }
  const res = pages[state.page].check(q, stage);
  if (!res) { msg.textContent = 'Complète la réponse avant de valider.'; return; }
  msg.textContent = '';
  answered = true;
  scores[state.page][1]++;
  if (res.ok) scores[state.page][0]++;
  stage.querySelectorAll('input').forEach(i => { i.disabled = true; });
  feedback.className = 'feedback ' + (res.ok ? 'ok' : 'ko');
  feedback.innerHTML = (res.ok ? '<b>Correct !</b>' : '<b>Faux.</b>') + (res.html || '');
  feedback.style.display = 'block';
  btnMain.textContent = 'Question suivante →';
  updateScore();
  btnMain.focus();
});
stage.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') btnMain.click();
});

refreshUI();
nextQuestion();
})();