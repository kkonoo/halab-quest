'use strict';
// HaLab Quest — 저장(IndexedDB, 안 되면 localStorage), 데이터 파일 읽기, 화면 이동(#/…), 공통 도구
// 퀘스트 내용은 data/ch1~4.json 과 data/cards/*.md 에서 읽어요 (화면 코드에 문구를 넣지 않기)
// db.progress[퀘스트 id] = { check, star, note }  check·star 는 체크한 시각(ms), note 는 ★ 실전 적용 한 줄
// db.progress['tb:교재 id'] = { check } 3장 교재 여권 스탬프 (퀘스트가 아니라서 ✓·★ 개수에는 안 들어감)
// db.progress['ch1-compass'].ans · .kw 1장 호기심 나침반의 답(방향 키 배열)과 관심 키워드
// db.records 발표 기록 · db.figcards Figure 순서 카드 · db.cv My CV · db.chapterDone[챕터 id] 챕터 완료 기록
// db.subs 투고 낚시터 원고 { id, title, casts: [{ journal, events: [{ s, d, note }] }], cvId }

const $ = id => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (typeof attrs === 'string') el.className = attrs;
  else if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat(9).filter(k => k != null && k !== false).map(k => (typeof k === 'number' ? String(k) : k)));
  return el;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
// '으로/로': 받침이 있으면(ㄹ 받침 빼고) 으로 — 탑으로, 마을로
const ro = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 && c % 28 !== 8 ? `${w}으로` : `${w}로`; };
const fmtDate = ms => { const d = new Date(ms); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

// ---------- 저장 ----------
// 같은 주소(kkonoo.github.io)의 다른 앱과 저장소를 같이 쓰므로 이름은 halab-quest* 로만
const KEY = 'halab-quest', VERSION = 1;
const fresh = () => ({ version: VERSION, owner: null, name: '', progress: {}, records: [], figcards: [], cv: [], chapterDone: {}, subs: [], avatar: 'intern-f' });
let db = fresh(), idb = null;
const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

const dbReady = new Promise(ok => {
  let r;
  try { r = indexedDB.open(KEY, 1); } catch { return ok(fallback()); }
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => {
    idb = r.result;
    try {
      const get = idb.transaction('kv').objectStore('kv').get('db');
      get.onsuccess = () => { if (get.result) db = migrate(JSON.parse(get.result)); ok(); };
      get.onerror = () => ok(fallback());
    } catch { ok(fallback()); }
  };
  r.onerror = () => ok(fallback());
});
function fallback() { const v = readJSON(KEY); if (v) db = migrate(v); }
function migrate(v) { return { ...fresh(), ...v, version: VERSION }; }

function persistLocal() {
  const s = JSON.stringify(db);
  if (idb) {
    try { const t = idb.transaction('kv', 'readwrite'); t.objectStore('kv').put(s, 'db'); return; } catch { /* 아래로 */ }
  }
  try { localStorage.setItem(KEY, s); } catch { /* 저장 못 해도 화면은 그대로 */ }
}
function persist() {
  persistLocal();
  window.onSave?.(); // sync.js가 바뀐 것만 올림
}

// ---------- 데이터 파일 ----------
const CHAPTER_IDS = ['ch1', 'ch2', 'ch3', 'ch4'];
let CHAPTERS = [];
const QUESTS = new Map(); // 퀘스트 id → { ...퀘스트, chapter }
const dataReady = Promise.all(CHAPTER_IDS.map(id => fetch(`data/${id}.json`).then(r => r.json()))).then(list => {
  CHAPTERS = list;
  for (const ch of list) ch.quests.forEach((q, i) => QUESTS.set(q.id, { ...q, chapter: ch, index: i }));
}).catch(e => { console.error(e); $('view').replaceChildren(h('p', 'panel', '데이터 파일을 읽지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.')); });

const cardCache = new Map();
function loadCards(file) {
  if (!cardCache.has(file)) cardCache.set(file, fetch(`data/cards/${file}`).then(r => (r.ok ? r.text() : '')).then(mdCards).catch(() => []));
  return cardCache.get(file);
}

// ---------- 진행도 ----------
const prog = id => db.progress[id] || {};
function setProg(id, patch) {
  const p = { ...prog(id), ...patch };
  for (const k of Object.keys(p)) if (p[k] == null || p[k] === '') delete p[k];
  if (Object.keys(p).length) db.progress[id] = p; else delete db.progress[id];
  persist();
}
function chapterCount(ch) {
  let check = 0, star = 0;
  for (const q of ch.quests) { if (prog(q.id).check) check++; if (prog(q.id).star) star++; }
  return { check, star, total: ch.quests.length };
}
const stampCount = () => Object.keys(db.progress).filter(k => k.startsWith('tb:') && db.progress[k].check).length;

// ---------- 내 캐릭터 (img/char/{id}-front|back.png) ----------
const AVATARS = [['intern-f', '인턴 (여)'], ['intern-m', '인턴 (남)'], ['grad-f', '대학원생 (여)'], ['grad-m', '대학원생 (남)']];
const studentImg = (view = 'back') => h('img', { class: 'sprite student', src: `img/char/${db.avatar || 'intern-f'}-${view}.png`, alt: '나' });

// ---------- 화면 공통 ----------
function setTitle(main, sub) {
  $('titleMain').textContent = main;
  $('titleSep').hidden = !sub;
  $('titleSub').textContent = sub || '';
  document.title = sub ? `${sub} · HaLab Quest` : 'HaLab Quest';
}
const panel = (title, ...kids) => h('section', 'panel', title ? h('h2', 'panel-head', title) : null, ...kids);
// 교수님 초상화: img/prof-{default|smile|explain|cheer}.png (캐릭터 기준 시트에서 잘라 씀)
function dialogBox(lines, face = 'default') {
  return h('div', 'dialog-box',
    h('div', 'portrait', h('img', { src: `img/prof-${face}.png`, alt: '교수님' })),
    h('div', 'speech', h('div', 'who', '교수님'), ...(Array.isArray(lines) ? lines : [lines]).map(l => h('p', null, l))));
}
const bigBtn = (label, href, cls = 'big-btn') => h('a', { class: cls, href }, label, '\u00a0›'); // › 만 다음 줄로 떨어지지 않게
// 앉은 고양이: img/char/cat-idle.png 네 칸(기본 · 깜빡 · 꼬리 · 귀)을 CSS로 넘겨요 (.cat-idle)
const catIdle = () => h('span', { class: 'sprite cat cat-idle', role: 'img', 'aria-label': '고양이' }, h('img', { src: 'img/char/cat-idle.png', alt: '' }));
// 장 수료 메달: done.badgeImg 그림이 있으면 그림, 없으면 이모지
const medal = (ch, small) => h('span', { class: `medal${small ? ' small' : ''}${ch.done.badgeImg ? ' pic' : ''}`, title: ch.done.badge },
  ch.done.badgeImg ? h('img', { src: ch.done.badgeImg, alt: '' }) : ch.done.badgeIcon || ch.icon);

let toastTimer;
function toast(text, ms = 2000) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), ms);
}

// 입력 창: fields = [{ key, label, type: text|textarea|date|select|url, options, value, placeholder }]
function openForm({ title, fields, onSave, onDelete, saveLabel = '저장' }) {
  const form = $('editForm'), dlg = $('editDlg');
  const inputs = {};
  form.replaceChildren(
    h('h2', null, title),
    ...fields.map(f => {
      let el;
      if (f.type === 'select') el = h('select', null, f.options.map(o => h('option', { value: o, selected: o === f.value }, o)));
      else if (f.type === 'textarea') { el = h('textarea', { rows: 3, placeholder: f.placeholder || '' }); el.value = f.value || ''; }
      else { el = h('input', { type: f.type || 'text', placeholder: f.placeholder || '' }); el.value = f.value || ''; }
      inputs[f.key] = el;
      return h('label', 'field', h('span', null, f.label), el);
    }),
    h('div', 'row end',
      onDelete ? h('button', { type: 'button', class: 'btn danger', onclick: () => { if (confirm('지울까요?')) { onDelete(); dlg.close(); } } }, '삭제') : null,
      h('span', 'grow'),
      h('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, '취소'),
      h('button', { type: 'submit', class: 'btn primary' }, saveLabel)));
  form.onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value.trim()]));
    if (onSave(v) !== false) dlg.close();
  };
  dlg.showModal();
  inputs[fields[0]?.key]?.focus();
}

// ---------- 화면 이동: #/  #/ch/ch4  #/q/퀘스트id[/칸 번호]  #/done/ch4  #/journey  #/cv  #/admin  #/fish ----------
function render() {
  if (!CHAPTERS.length) return;
  const [, page = '', a, b] = location.hash.replace(/^#/, '').split('/');
  let el;
  try {
    if (page === 'ch' && CHAPTERS.find(c => c.id === a)) el = viewChapter(CHAPTERS.find(c => c.id === a));
    else if (page === 'q' && QUESTS.has(a)) el = viewQuest(QUESTS.get(a), +b || 0);
    else if (page === 'done' && CHAPTERS.find(c => c.id === a)) el = viewDone(CHAPTERS.find(c => c.id === a));
    else if (page === 'journey') el = viewJourney();
    else if (page === 'cv') el = viewCV();
    else if (page === 'admin') el = viewAdmin();
    else if (page === 'fish') el = viewFish();
    else el = viewWorld();
  } catch (e) {
    console.error(e);
    el = panel('화면을 그리지 못했어요', h('p', null, String(e.message || e)));
  }
  $('view').replaceChildren(el);
  $('adminLink').hidden = !window.cloud?.isPI;
}
let lastPage = '';
addEventListener('hashchange', () => {
  const page = location.hash.split('/').slice(0, 3).join('/');
  render();
  if (page !== lastPage) scrollTo(0, 0);
  lastPage = page;
});

// ---------- 메뉴 ----------
$('menuBtn').onclick = () => {
  $('nameInput').value = db.name || '';
  $('avatarPick').replaceChildren(...AVATARS.map(([id, label]) => h('button', { class: `avatar-opt${(db.avatar || 'intern-f') === id ? ' on' : ''}`, onclick: () => { db.avatar = id; persist(); render(); $('menuBtn').click(); } },
    h('img', { src: `img/char/${id}-front.png`, alt: label }), h('small', null, label))));
  const u = window.cloud?.user;
  $('accountPanel').replaceChildren(
    !window.cloud ? '로그인 기능이 꺼져 있어요. 진행도는 이 브라우저에만 저장돼요.'
      : u ? h('span', null, `${u.email} 로 로그인했어요. PC와 폰에서 같은 진행도를 볼 수 있어요. `, h('button', { class: 'btn small', onclick: () => window.cloud.logout() }, '로그아웃'))
        : h('span', null, '로그인하면 PC와 폰에서 같은 진행도를 보고, 교수님도 진행도를 확인할 수 있어요. ', h('button', { class: 'btn small primary', onclick: () => window.cloud.login() }, 'Google 로그인')));
  $('menuDlg').showModal();
};
$('menuClose').onclick = () => $('menuDlg').close();
$('menuDlg').addEventListener('click', e => { if (e.target.closest('a')) $('menuDlg').close(); });
$('nameSave').onclick = () => { db.name = $('nameInput').value.trim(); persist(); toast('이름을 저장했어요'); };
$('exportBtn').onclick = () => {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' })), download: `halab-quest-${today()}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
};
$('importInput').onchange = async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const v = JSON.parse(await f.text());
    if (!v.progress) throw new Error('형식');
    if (!confirm('지금 진행도를 이 파일 내용으로 바꿀까요?')) return;
    db = migrate({ ...v, owner: db.owner });
    persist();
    render();
    toast('불러왔어요');
  } catch { alert('HaLab Quest 백업 파일이 아니에요.'); }
};

// 폰 뒤로 가기: 열린 창부터 닫기 (dialog 기본 동작) — 화면 이동은 주소(#)로 하므로 브라우저 기본 뒤로 가기를 씀

addEventListener('DOMContentLoaded', () => Promise.all([dbReady, dataReady]).then(render));
