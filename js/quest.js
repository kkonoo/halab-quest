'use strict';
// 퀘스트 화면 하나로 모든 퀘스트를 그려요 (내용은 data/chN.json의 퀘스트 항목)
// 칸: 좌측 메뉴 | 가운데 장면·읽기 카드 | 우측 정보 패널 + ✓·★
//     핵심 UI(widget: flow · figcards)       | 자료 링크 또는 발표 기록
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
    h('div', 'q-stage', secs[sec].overview ? stageScene(q) : secs[sec].records ? recordsFull(q) : readingCard(secs[sec])),
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
    h('div', { class: 'scene quest-scene', style: q.bg ? `background-image:url(${q.bg})` : null },
      q.place ? h('span', 'place', q.place) : null,
      q.bubble ? h('div', 'bubble', q.bubble) : null,
      h('div', 'props', q.scene || q.icon),
      h('div', 'walker', h('img', { class: 'sprite', src: `img/char/prof-${q.pose || 'point'}.png`, alt: '교수님' }), ' ', '🧑‍🎓', h('img', { class: 'sprite cat', src: 'img/char/cat-sit.png', alt: '고양이' }))),
    h('div', { class: 'card overview', html: md(q.overview || '') }));
}

function readingCard(s) {
  const card = h('div', { class: 'card reading', html: md(s.md) });
  if (s.show === 'figcards') {
    card.append(db.figcards.length
      ? h('ol', 'skeleton', db.figcards.map((f, i) => h('li', null, h('b', null, `Fig ${i + 1} 단락 · `), f.text)))
      : h('p', 'hint', '아직 Figure 순서 카드가 없어요. 1번 퀘스트에서 먼저 써보세요. ', h('a', { href: '#/q/ch4-storyboard' }, 'Figure 스토리보드 ›')));
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
  return panel(w.title,
    h('div', 'flow', w.steps.map((s, i) => [i ? h('span', 'arrow', '→') : null,
      h('div', { class: `step${s.hl ? ' hl' : ''}` },
        h('span', 'step-icon', s.icon), h('b', null, s.label), s.sub ? h('small', null, s.sub) : null,
        s.done ? h('span', `mk ${prog(s.done).check ? 'ok' : 'empty'}`, prog(s.done).check ? '✓' : '○') : null,
        s.tag ? h('a', { class: 'tag', href: `#/q/${s.done}` }, s.tag) : null)])),
    w.band ? h('div', 'band', w.band) : null);
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
