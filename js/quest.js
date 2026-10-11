'use strict';
// 퀘스트 화면 하나로 모든 퀘스트를 그려요 (내용은 data/chN.json의 퀘스트 항목)
// 칸: 좌측 메뉴 | 가운데 장면·읽기 카드 | 우측 정보 패널 + ✓·★
//     핵심 UI(widget: flow · figcards · lights · passport) | 자료 링크 또는 발표 기록
//     교수님 대화창                            | 다음 버튼

const cardData = new Map(); // 카드 md 파일 → [{ title, md }] (다 읽으면 다시 그림)
function cardsNow(file) {
  if (cardData.has(file)) return cardData.get(file);
  loadCards(file).then(c => { cardData.set(file, c); render(); });
  return null;
}

const DEFAULT_CHECK = '자료를 읽고 따라 해봤다면 체크해보세요!';
const DEFAULT_STAR = '실제 연구에 써봤다면 기록해보세요.';
const DEFAULT_DIALOG = ['천천히 읽고, 따라 해보고, 다 했으면 체크해요.', '실제 연구에 써봤다면 ★로 남겨 두세요.'];

function questSections(q) {
  let secs = q.sections || [];
  if (q.cards) {
    const c = cardsNow(q.cards);
    secs = c ? c.filter(s => !(q.cardsSkip || []).some(k => s.title.startsWith(k))) : [{ title: '불러오는 중…', md: '' }];
  }
  const list = [{ title: '퀘스트 개요', overview: true }, ...secs];
  if (q.records) list.push({ title: '나의 발표 기록', records: true });
  return list;
}

function viewQuest(q, sec) {
  const ch = q.chapter, secs = questSections(q);
  sec = Math.min(sec, secs.length - 1);
  setTitle(`${ch.no}장. ${ch.title}`, `${q.index + 1}. ${q.title}`);
  const next = ch.quests[q.index + 1];
  return h('div', `screen quest c-${ch.id}`,
    h('section', 'panel q-menu',
      h('h2', 'panel-head', h('span', 'qi', q.icon), q.title),
      h('nav', null, secs.map((s, i) => h('a', { class: i === sec ? 'on' : null, href: `#/q/${q.id}/${i}` },
        s.overview ? '⚙️ ' : '', i && !s.records ? `${i}. ` : '', s.title))),
      h('a', { class: 'back', href: `#/ch/${ch.id}` }, `← ${ch.no}장 지도`)),
    h('div', 'q-stage', secs[sec].overview ? stageScene(q) : secs[sec].records ? recordsFull(q) : readingCard(secs[sec], q)),
    h('div', 'q-info',
      q.info ? infoPanel(q.info) : null,
      checkBoxes(q)),
    q.widget ? h('div', 'q-widget', widget(q.widget)) : null,
    h('div', 'q-side', q.records ? recordsPanel(q) : linksPanel(q)),
    h('div', 'q-dialog', dialogBox(q.dialog || DEFAULT_DIALOG, q.face || 'explain')),
    h('div', 'q-next', next ? bigBtn(`다음: ${next.title}`, `#/q/${next.id}`) : bigBtn(`다음: ${ch.no}장 완료`, `#/done/${ch.id}`)));
}

function stageScene(q) {
  return h('div', 'stage',
    h('div', { class: `scene quest-scene${q.bg ? ' has-bg' : ''}`, style: q.bg ? `background-image:url(${q.bg})` : null },
      q.place ? h('span', 'place', q.place) : null,
      q.bubble ? h('div', 'bubble', q.bubble) : null,
      q.bg ? null : h('div', 'props', q.scene || q.icon),
      h('div', 'walker', h('img', { class: 'sprite', src: `img/char/prof-${q.pose || 'point'}.png`, alt: '교수님' }), ' ', studentImg('back'), h('img', { class: 'sprite cat', src: 'img/char/cat-sit.png', alt: '고양이' }))),
    h('div', { class: 'card overview', html: md(q.overview || '') }));
}

function readingCard(s, q) {
  const card = h('div', { class: 'card reading', html: md(s.md) });
  if (s.show === 'figcards') {
    card.append(db.figcards.length
      ? h('ol', 'skeleton', db.figcards.map((f, i) => h('li', null, h('b', null, `Fig ${i + 1} 단락 · `), f.text)))
      : h('p', 'hint', '아직 Figure 순서 카드가 없어요. 1번 퀘스트에서 먼저 써보세요. ', h('a', { href: '#/q/ch4-storyboard' }, 'Figure 스토리보드 ›')));
  }
  // 판단 미션: 상황 카드만 보여 주고 채점하지 않음. '교재에서 확인'은 그 스테이션(widget.steps[station])의 교재로
  if (s.missions) {
    card.append(h('div', 'missions', s.missions.map((m, i) => {
      const st = q.widget?.steps?.[m.station];
      return h('div', 'mission',
        h('b', null, `🃏 상황 ${i + 1}`), h('p', null, m.text), h('p', 'hint', m.ask),
        st?.url ? h('a', { class: 'btn small', href: st.url, target: '_blank', rel: 'noopener' }, `교재에서 확인 · ${st.label} ↗`) : null);
    })));
  }
  return card;
}

function infoPanel(info) {
  return panel(info.title,
    h('table', 'info-table', info.rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v)))),
    info.note ? h('p', 'info-note', info.note) : null);
}

function checkBoxes(q) {
  const p = prog(q.id);
  return h('div', 'checks',
    h('button', { class: `check-box${p.check ? ' on' : ''}`, onclick: () => { setProg(q.id, { check: p.check ? null : Date.now() }); toast(p.check ? '체크를 풀었어요' : '학습 완료! ✓'); render(); } },
      h('span', 'mk ok', p.check ? '✓' : ''), h('b', null, '학습 완료'), h('small', null, q.check || DEFAULT_CHECK),
      p.check ? h('small', 'when', fmtDate(p.check)) : null),
    q.noStar ? null : h('button', { class: `check-box star${p.star ? ' on' : ''}`, onclick: () => starForm(q) },
      h('span', 'mk star', p.star ? '★' : '☆'), h('b', null, '실전 적용 (선택)'), h('small', null, p.note ? `“${p.note}”` : q.star || DEFAULT_STAR),
      p.star ? h('small', 'when', fmtDate(p.star)) : null));
}

function starForm(q) {
  const p = prog(q.id);
  openForm({
    title: `★ 실전 적용 · ${q.title}`,
    fields: [{ key: 'note', label: '어디에 어떻게 써봤나요? (한 줄, 비워도 돼요)', type: 'textarea', value: p.note, placeholder: q.star || '' }],
    saveLabel: p.star ? '저장' : '★ 남기기',
    onSave: v => { setProg(q.id, { star: p.star || Date.now(), note: v.note || null }); toast('실전 적용을 남겼어요 ★'); render(); },
    onDelete: p.star ? () => { setProg(q.id, { star: null, note: null }); render(); } : null,
  });
}

// ---------- 핵심 UI ----------
function widget(w) {
  if (w.type === 'figcards') return figCards(w);
  if (w.type === 'lights') return lights(w);
  if (w.type === 'passport') return passport(w);
  return panel(w.title,
    h('div', 'flow', w.steps.map((s, i) => [i ? h('span', 'arrow', '→') : null,
      s.branch ? h('div', 'branch', s.branch.map(flowStep)) : flowStep(s)])),
    w.band ? h('div', 'band', w.band) : null);
}

// 흐름 한 칸. url = 바깥 자료(새 탭), href = 게임 안 주소. branch = 나란한 두 길(세로로 쌓음)
function flowStep(s) {
  const kids = [h('span', 'step-icon', s.icon), h('b', null, s.label), s.sub ? h('small', null, s.sub) : null,
    s.done ? h('span', `mk ${prog(s.done).check ? 'ok' : 'empty'}`, prog(s.done).check ? '✓' : '○') : null,
    s.tag ? h('a', { class: 'tag', href: `#/q/${s.done}` }, s.tag) : null];
  const cls = `step${s.hl ? ' hl' : ''}`;
  if (s.url) return h('a', { class: cls, href: s.url, target: '_blank', rel: 'noopener' }, kids);
  if (s.href) return h('a', { class: cls, href: s.href }, kids);
  return h('div', cls, kids);
}

// AI 신호등: lights = [{ color: green|yellow|red, label, items }]
function lights(w) {
  return panel(w.title,
    h('div', 'lights', w.lights.map(l => h('div', `light ${l.color}`,
      h('div', 'lamp-head', h('span', 'lamp'), h('b', null, l.label)),
      h('ul', null, l.items.map(t => h('li', null, t)))))),
    w.band ? h('div', 'band', w.band) : null);
}

// ---------- 교재 여권: 교재 허브의 textbooks.json(w.src)을 그대로 읽어 와요 ----------
// 교재 1권 = 스탬프 1개 → 진행도에 'tb:교재id' 키로 저장 (✓만, ★ 없음)
// 분야(group) 안에서 단계(stage) 순서 → 같은 단계는 json 순서가 추천 순서. 잠그지 않음
let passportBooks = null, passportLoading = false; // null: 아직, 배열: 교재 목록, { error }: 못 읽음
function loadPassport(src) {
  if (passportLoading) return;
  passportLoading = true;
  fetch(src).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(list => { passportBooks = list.filter(b => b?.id && b.name); })
    .catch(e => { console.error(e); passportBooks = { error: true }; })
    .finally(() => { passportLoading = false; render(); });
}

function passport(w) {
  if (!passportBooks || passportBooks.error) {
    if (!passportBooks) loadPassport(w.src);
    return panel(w.title, passportBooks ? h('p', 'hint', '교재 목록을 불러오지 못했어요. ',
      h('button', { class: 'btn small', onclick: () => { passportBooks = null; render(); } }, '다시 불러오기'), ' ',
      h('a', { href: w.hub, target: '_blank', rel: 'noopener' }, 'HaLab Textbooks에서 보기 ↗'))
      : h('p', 'hint', '교재 목록을 불러오는 중이에요…'));
  }
  const rank = s => { const i = w.stages.indexOf(s); return i < 0 ? w.stages.length : i; };
  const label = new Map(w.groups);
  const stamped = b => !!prog(`tb:${b.id}`).check;
  const groups = [...new Set([...label.keys(), ...passportBooks.map(b => b.group)])]
    .map(g => [g, passportBooks.filter(b => b.group === g).sort((a, b) => rank(a.stage) - rank(b.stage))])
    .filter(([, list]) => list.length);
  return panel(`${w.title} · 스탬프 ${passportBooks.filter(stamped).length} / ${passportBooks.length}`,
    h('div', 'passport', groups.map(([g, list]) => {
      const next = list.find(b => !stamped(b));
      return h('div', 'pp-group',
        h('h3', null, label.get(g) || g, h('small', null, `${list.filter(stamped).length} / ${list.length}`)),
        h('div', 'pp-books', list.map((b, i) => stampCard(w, b, i, list[i - 1], b === next, stamped))));
    })),
    w.band ? h('div', 'band', w.band) : null);
}

function stampCard(w, b, i, prev, isNext, stamped) {
  const p = prog(`tb:${b.id}`), quest = w.inQuest?.[b.id];
  const name = quest ? h('a', { href: `#/q/${quest}` }, b.name, ' ›')
    : b.url ? h('a', { href: b.url, target: '_blank', rel: 'noopener' }, b.name, ' ↗') : b.name;
  return h('div', `pp-book${p.check ? ' on' : ''}${isNext ? ' next' : ''}`,
    h('div', 'pp-top', h('span', 'pp-num', i < 20 ? String.fromCharCode(0x2460 + i) : `${i + 1}.`), isNext ? h('span', 'chip', '다음 추천') : null),
    h('b', 'pp-name', name),
    quest ? h('small', null, 'HaLab Quest 안에서 해요') : !b.url ? h('small', null, '주소 확인 중') : b.desc ? h('small', 'pp-desc', b.desc) : null,
    prev && !p.check && !stamped(prev) ? h('small', 'pp-before', `먼저 보면 좋아요: ${prev.name}`) : null,
    h('button', { class: 'stamp', onclick: () => { setProg(`tb:${b.id}`, { check: p.check ? null : Date.now() }); toast(p.check ? '도장을 지웠어요' : `도장 쾅! 📘 ${b.name}`); render(); } },
      p.check ? `📘 ${fmtDate(p.check)}` : '도장 찍기'));
}

function figCards(w) {
  const list = db.figcards;
  const edit = f => openForm({
    title: f ? `Fig ${list.indexOf(f) + 1}` : '새 Figure 카드',
    fields: [{ key: 'text', label: '이 그림의 결론 한 문장', value: f?.text, placeholder: '예: 환자군에서 염증 세포가 늘었어요' }],
    onSave: v => { if (!v.text) return false; if (f) f.text = v.text; else list.push({ id: uid(), text: v.text }); persist(); render(); },
    onDelete: f ? () => { db.figcards = list.filter(x => x !== f); persist(); render(); } : null,
  });
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; persist(); render(); };
  return panel(w.title,
    h('div', 'flow cards', list.map((f, i) => [i ? h('span', 'arrow', '→') : null,
      h('div', 'step fig',
        h('button', { class: 'fig-body', onclick: () => edit(f) }, h('span', 'step-icon', '📈'), h('b', null, `Fig ${i + 1}`), h('small', null, f.text)),
        h('span', 'fig-move', h('button', { class: 'icon-btn small', title: '앞으로', onclick: () => move(i, -1) }, '‹'), h('button', { class: 'icon-btn small', title: '뒤로', onclick: () => move(i, 1) }, '›')))]),
    list.length ? h('span', 'arrow', '→') : null,
    h('button', { class: 'step add', onclick: () => edit(null), title: '카드 추가' }, '+')),
    w.band ? h('div', 'band', w.band) : null);
}

// ---------- 자료 · 발표 기록 ----------
function linksPanel(q) {
  return panel('자료',
    h('div', 'links', (q.links || []).map(l =>
      l.url ? h('a', { class: 'link', href: l.url, target: '_blank', rel: 'noopener' }, l.label, h('span', null, '↗'))
        : l.quest || l.href ? h('a', { class: `link${l.hl ? ' hl' : ''}`, href: l.href || `#/q/${l.quest}` }, l.label, h('span', null, '›'))
          : h('div', 'link plain', l.label, h('small', null, l.note || ''))),
    !(q.links || []).length ? h('p', 'hint', '연결할 자료는 곧 채워요.') : null),
    q.warn ? h('p', 'warn', '🚫 ', q.warn) : null);
}

function recordForm(q, r) {
  openForm({
    title: r ? '발표 기록 고치기' : '발표 기록하기',
    fields: [
      { key: 'date', label: '날짜', type: 'date', value: r?.date || today() },
      { key: 'kind', label: '종류', type: 'select', options: r && !q.records.includes(r.kind) ? [r.kind, ...q.records] : q.records, value: r?.kind },
      { key: 'text', label: '받은 피드백 한 줄', value: r?.text, placeholder: '예: 배경을 더 짧게' },
      { key: 'fix', label: '다음에 고칠 점 (비워도 돼요)', value: r?.fix },
    ],
    onSave: v => {
      if (!v.text) return false;
      if (r) Object.assign(r, v); else db.records.push({ id: uid(), ...v });
      persist(); render(); toast('발표 기록을 남겼어요');
    },
    onDelete: r ? () => { db.records = db.records.filter(x => x !== r); persist(); render(); } : null,
  });
}
const sortedRecords = () => [...db.records].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const recordRow = (q, r) => h('button', { class: 'record', onclick: () => recordForm(q, r) },
  h('span', null, `${(r.date || '').slice(5).replace('-', '/')} · ${r.kind} · ‘${r.text}’`));

function recordsPanel(q) {
  const list = sortedRecords(), lastProgress = list.find(r => r.kind === 'Progress');
  return panel('나의 발표 기록',
    q.records.includes('Progress') && lastProgress ? h('p', 'hint', '다음 발표의 In the previous: ', h('b', null, `‘${lastProgress.text}’`)) : null,
    h('div', 'records', list.slice(0, 3).map(r => recordRow(q, r))),
    h('button', { class: 'btn add-record', onclick: () => recordForm(q) }, '+ 발표 기록하기'),
    h('p', 'hint center', q.chapter.id === 'ch4' ? '3장 발표 기록에 이어져요' : '다음 발표의 In the previous로 이어져요'),
    list.length > 3 ? h('a', { class: 'more', href: `#/q/${q.id}/${questSections(q).length - 1}` }, `전체 ${list.length}개 보기 ›`) : null);
}

function recordsFull(q) {
  const list = sortedRecords();
  return h('div', 'card reading',
    h('h3', null, '나의 발표 기록'),
    list.length ? h('div', 'records', list.map(r => h('div', 'record-full', recordRow(q, r), r.fix ? h('small', null, `다음에 고칠 점: ${r.fix}`) : null)))
      : h('p', 'hint', '아직 기록이 없어요. 발표를 마치면 받은 피드백을 한 줄로 남겨 보세요.'),
    h('button', { class: 'btn', onclick: () => recordForm(q) }, '+ 발표 기록하기'));
}
