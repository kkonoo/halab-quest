'use strict';
// 퀘스트 화면 하나로 모든 퀘스트를 그려요 (내용은 data/chN.json의 퀘스트 항목)
// 칸: 좌측: 메뉴 → 장 지도 → 이전 · 다음 | 가운데: 장면 → 교수님 대화창 → 읽기 카드 → 핵심 UI(widget) | 우측: 정보 패널 → 자료(또는 발표 기록) → ✓·★
//     핵심 UI: flow · figcards · lights · passport · compass

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
  const prev = ch.quests[q.index - 1], next = ch.quests[q.index + 1];
  return h('div', `screen quest c-${ch.id}`,
    h('div', 'q-menu',
      h('section', 'panel',
        h('h2', 'panel-head', q.title, ' ', h('span', 'qi', q.icon)),
        h('nav', null, secs.map((s, i) => h('a', { class: i === sec ? 'on' : null, href: `#/q/${q.id}/${i}` },
          s.overview ? '⚙️ ' : '', i && !s.records ? `${i}. ` : '', s.title)))),
      h('a', { class: 'map-btn', href: `#/ch/${ch.id}` }, `← ${ch.no}장 지도`),
      h('div', 'q-nav',
        prev ? h('a', { class: 'big-btn', href: `#/q/${prev.id}` }, '‹\u00a0', `이전: ${prev.title}`) : null, // 첫 퀘스트는 바로 위 '장 지도' 버튼이 이전
        next ? bigBtn(`다음: ${next.title}`, `#/q/${next.id}`) : bigBtn(`다음: ${ch.no}장 완료`, `#/done/${ch.id}`))),
    // 가운데: (개요일 때) 장면 그림 → 교수님 대화창 → 읽을 내용
    h('div', 'q-stage',
      secs[sec].overview ? stageScene(q) : null,
      h('div', 'q-dialog', dialogBox(q.dialog || DEFAULT_DIALOG, q.face || 'explain')),
      secs[sec].overview ? h('div', { class: 'card overview', html: md(q.overview || '') }) : secs[sec].records ? recordsFull(q) : readingCard(secs[sec], q),
      q.widget ? h('div', 'q-widget', widget(q.widget, q)) : null),
    h('div', 'q-info',
      q.info ? infoPanel(q.info) : null,
      q.records ? recordsPanel(q) : linksPanel(q),
      checkBoxes(q)));
}

function stageScene(q) {
  return h('div', { class: `scene quest-scene${q.bg ? ' has-bg' : ''}`, style: q.bg ? `background-image:url(${q.bg})` : null },
      glowLayer(q.bg),
      q.place ? h('span', 'place', q.place) : null,
      q.bubble ? h('div', 'bubble', q.bubble) : null,
      q.bg ? null : h('div', 'props', q.scene || q.icon),
      h('div', 'walker', profImg(q.pose), ' ', studentImg('back'), catIdle()));
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
function widget(w, q) {
  if (w.type === 'figcards') return figCards(w);
  if (w.type === 'compass') return compass(w, q);
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

// ---------- 호기심 나침반: 질문(questions)에 하나씩 답하면 가장 많이 고른 방향(dirs)을 가리켜요 ----------
// 채점 · 적성 판정이 아니에요. 답은 진행도에 { ans: [방향 키…], kw: '관심 키워드' }로 저장
function compass(w, q) {
  const p = prog(q.id), ans = p.ans || [], n = w.questions.length;
  const save = patch => { setProg(q.id, patch); render(); };
  if (ans.length < n) {
    const cur = w.questions[ans.length];
    return panel(`${w.title} · 질문 ${ans.length + 1} / ${n}`,
      h('p', 'cp-q', cur.q),
      h('div', 'cp-choices', w.order.map(k => h('button', { class: 'cp-choice', onclick: () => save({ ans: [...ans, k] }) },
        h('span', 'cp-icon', w.dirs[k].icon), h('span', null, cur.a[k])))),
      h('div', 'row',
        h('span', 'cp-dots', w.questions.map((_, i) => h('span', i < ans.length ? 'on' : i === ans.length ? 'cur' : null))),
        ans.length ? h('button', { class: 'btn small', onclick: () => save({ ans: ans.slice(0, -1) }) }, '‹ 이전 질문') : null));
  }
  const count = Object.fromEntries(w.order.map(k => [k, ans.filter(a => a === k).length]));
  const top = w.order.filter(k => count[k] === Math.max(...Object.values(count)));
  const kw = h('input', { value: p.kw || '', placeholder: '예: 단일세포 · 자가면역 · eQTL' });
  return panel(`${w.title} · 나의 방향`,
    h('div', 'cp-result',
      h('div', 'cp-rose',
        w.order.map((k, i) => h('span', `cp-dir d${i}${top.includes(k) ? ' on' : ''}`, h('b', null, w.dirs[k].icon), w.dirs[k].label, h('small', null, `${count[k]}`))),
        h('span', { class: 'cp-needle', style: `transform:rotate(${w.order.indexOf(top[0]) * 90}deg)` }),
        h('span', 'cp-hub')),
      h('div', 'cp-text',
        top.map(k => h('div', 'cp-dir-card', h('b', null, w.dirs[k].icon, ' ', w.dirs[k].label), h('p', null, w.dirs[k].text), h('div', 'links', w.dirs[k].links.map(linkEl)))),
        w.paper ? linkEl(w.paper) : null,
        h('div', 'field', h('span', null, '나의 관심 키워드 (2–3개)'),
          h('div', 'row', kw, h('button', { class: 'btn primary', onclick: () => { save({ kw: kw.value.trim() || null }); toast('관심 키워드를 저장했어요'); } }, '저장'))),
        h('div', 'row end', h('button', { class: 'btn small', onclick: () => { if (confirm('나침반 답을 지우고 다시 할까요?')) save({ ans: null }); } }, '다시 답하기')))));
}

// ---------- 교재 여권: 분야(groups)마다 한 쪽, 교재(books) 1권 = 동그라미 스탬프 1개 ----------
// 분야 안의 교재 순서가 추천 순서. 잠그지 않음. 스탬프는 진행도에 'tb:교재id' 키로 저장 (✓만, ★ 없음)
function passport(w) {
  const stamped = b => !!prog(`tb:${b.id}`).check;
  const all = w.groups.flatMap(g => g.books);
  return panel(`${w.title} · 스탬프 ${all.filter(stamped).length} / ${all.length}`,
    h('div', 'passport', w.groups.map(g => {
      const next = g.books.find(b => !stamped(b));
      return h('section', { class: 'pp-page', style: `--ink:${g.color}` },
        h('h3', null, h('span', null, g.label, ' ', g.icon), h('small', null, `${g.books.filter(stamped).length} / ${g.books.length}`)),
        h('div', 'pp-stamps', g.books.map((b, i) => [i ? h('span', 'arrow', '→') : null, stampSlot(g, b, i, g.books[i - 1], b === next, stamped)])),
        h('p', 'pp-next', next ? ['다음 추천: ', h('b', null, next.name)] : '이 분야 도장을 모두 찍었어요 ✓'));
    })),
    w.band ? h('div', 'band', w.band) : null);
}

// 동그라미를 누르면 도장, 이름을 누르면 교재가 새 탭에서 열려요 (스탬프 그림: img/ui/stamp-*.png, 빈 자리는 stamp-empty)
function stampSlot(g, b, i, prev, isNext, stamped) {
  const p = prog(`tb:${b.id}`);
  const tip = [b.desc, prev && !p.check && !stamped(prev) ? `먼저 보면 좋아요: ${prev.name}` : null].filter(Boolean).join('\n');
  return h('div', 'pp-slot',
    h('button', {
      class: `pp-stamp${p.check ? ' on' : ''}${isNext ? ' next' : ''}`, style: p.check ? `--tilt:${i % 2 ? 7 : -9}deg` : null,
      title: p.check ? `도장 지우기 (${fmtDate(p.check)})` : '도장 찍기', 'aria-label': `${b.name} ${p.check ? '도장 지우기' : '도장 찍기'}`,
      onclick: () => { setProg(`tb:${b.id}`, { check: p.check ? null : Date.now() }); toast(p.check ? '도장을 지웠어요' : `도장 쾅! ${g.icon} ${b.name}`); render(); },
    }, h('img', { src: p.check ? g.stamp : 'img/ui/stamp-empty.png', alt: '' }), p.check ? null : h('span', 'pp-num', String.fromCharCode(0x2460 + i))),
    h('a', { class: 'pp-name', href: b.url, target: '_blank', rel: 'noopener', title: tip || null }, b.name, ' ↗'),
    p.check ? h('small', 'pp-date', fmtDate(p.check)) : null);
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
// 자료 링크 한 칸: url = 바깥(새 탭), quest · href = 게임 안, 둘 다 없으면 글만(note)
const linkEl = l => l.url ? h('a', { class: 'link', href: l.url, target: '_blank', rel: 'noopener' }, l.label, h('span', null, '↗'))
  : l.quest || l.href ? h('a', { class: `link${l.hl ? ' hl' : ''}`, href: l.href || `#/q/${l.quest}` }, l.label, h('span', null, '›'))
    : h('div', 'link plain', l.label, h('small', null, l.note || ''));

function linksPanel(q) {
  return panel('자료',
    h('div', 'links', (q.links || []).map(linkEl),
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
