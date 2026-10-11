'use strict';
// My Journey (학습 진행도와 성장 기록) · My CV (실제 연구 실적)

function viewJourney() {
  setTitle('My Journey', '나의 성장 기록');
  let check = 0, star = 0;
  for (const ch of CHAPTERS) { const c = chapterCount(ch); check += c.check; star += c.star; }
  const total = CHAPTERS.reduce((a, ch) => a + ch.quests.length, 0);
  const badges = CHAPTERS.filter(ch => db.chapterDone[ch.id]);

  // 기록 줄: ✓ · ★ · 발표 · 챕터 완료를 날짜순으로
  const events = [];
  for (const [id, p] of Object.entries(db.progress)) {
    const q = QUESTS.get(id);
    if (!q) continue;
    const where = `${q.chapter.no}장 ${q.title}`;
    if (p.check) events.push({ t: p.check, icon: '✓', cls: 'ok', text: `학습 완료 · ${where}` });
    if (p.star) events.push({ t: p.star, icon: '★', cls: 'star', text: `실전 적용 · ${where}${p.note ? ` — ${p.note}` : ''}` });
  }
  for (const x of db.subs) for (const c of x.casts) for (const e of c.events) if (e.s === 'submitted' || e.s === 'accepted')
    events.push({ t: Date.parse(e.d) || 0, icon: e.s === 'accepted' ? '🐟' : '🎣', text: `${e.s === 'accepted' ? 'Accept' : '투고'} · ${x.title} → ${c.journal}` });
  for (const r of db.records) events.push({ t: Date.parse(r.date) || 0, icon: '🎤', text: `${r.kind} 발표 · ‘${r.text}’` });
  for (const ch of badges) events.push({ t: db.chapterDone[ch.id].at, icon: ch.done.badgeIcon || ch.icon, text: `${ch.done.badge}` });
  events.sort((a, b) => b.t - a.t);

  return h('div', 'screen journey',
    h('div', 'stats-row',
      h('div', 'stat-card', h('span', 'mk ok', '✓'), h('b', null, `${check} / ${total}`), h('small', null, '학습 완료')),
      h('div', 'stat-card', h('span', 'mk star', '★'), h('b', null, star), h('small', null, '실전 적용')),
      h('div', 'stat-card', h('span', 'medal small', '🏅'), h('b', null, badges.length), h('small', null, '수료 배지')),
      h('div', 'stat-card', h('span', null, '🎤'), h('b', null, db.records.length), h('small', null, '발표 기록'))),
    panel('챕터별 진행도',
      h('div', 'chapter-rows', CHAPTERS.map(ch => {
        const c = chapterCount(ch);
        return h('div', 'chapter-row',
          h('a', { class: 'ch-name', href: `#/ch/${ch.id}` }, ch.icon, ' ', `${ch.no}장. ${ch.title}`, h('small', null, `✓ ${c.check}/${c.total}`)),
          h('div', 'chips', ch.quests.map(q => h('a', { class: `qchip${prog(q.id).check ? ' ok' : ''}`, href: `#/q/${q.id}`, title: q.title },
            q.title, ' ', q.icon, prog(q.id).star ? ' ★' : ''))),
          db.chapterDone[ch.id] ? h('span', { class: 'medal small', title: ch.done.badge }, ch.done.badgeIcon || ch.icon) : null);
      }))),
    panel('나의 기록',
      events.length ? h('ul', 'timeline', events.slice(0, 60).map(e => h('li', null,
        h('span', `mk ${e.cls || ''}`, e.icon), h('span', 'tl-text', e.text), h('small', null, e.t ? fmtDate(e.t) : ''))))
        : h('p', 'hint', '퀘스트를 하나 끝내고 체크하면 여기에 기록이 쌓여요.')),
    h('div', 'row end', h('a', { class: 'btn', href: '#/fish' }, '🎣 투고 낚시터'), h('a', { class: 'btn', href: '#/cv' }, '📜 My CV'), bigBtn('월드맵으로', '#/')));
}

const CV_TYPES = ['논문', '학회 발표', '수상', '연구비', '기타'];
const CV_ROLES = { 논문: ['제1저자', '공동 제1저자', '공저자', '교신저자'], '학회 발표': ['구두', '포스터', '초청'], 수상: ['-'], 연구비: ['연구책임자', '참여'], 기타: ['-'] };

function cvForm(item, type) {
  const t = item?.type || type || '논문';
  openForm({
    title: item ? 'My CV 고치기' : `My CV · ${t} 추가`,
    fields: [
      { key: 'type', label: '종류', type: 'select', options: CV_TYPES, value: t },
      { key: 'title', label: t === '논문' ? '논문 제목' : '제목', value: item?.title },
      { key: 'venue', label: t === '논문' ? '저널 (상태: 투고 중 · 게재 등)' : t === '학회 발표' ? '학회 이름' : '기관 · 행사', value: item?.venue },
      { key: 'role', label: '역할', type: 'select', options: CV_ROLES[t] || ['-'], value: item?.role },
      { key: 'date', label: '날짜', type: 'date', value: item?.date || today() },
      { key: 'link', label: '링크 (DOI 등, 비워도 돼요)', type: 'url', value: item?.link },
    ],
    onSave: v => {
      if (!v.title) return false;
      if (v.role === '-') v.role = '';
      if (item) Object.assign(item, v); else db.cv.push({ id: uid(), ...v });
      persist(); render(); toast('My CV에 저장했어요');
    },
    onDelete: item ? () => { db.cv = db.cv.filter(x => x !== item); persist(); render(); } : null,
  });
}

function viewCV() {
  setTitle('My CV', '실제 연구 실적');
  return h('div', 'screen cv',
    h('p', 'hint', '게임 진행도와 따로, 실제 논문 · 학회 발표 · 수상 실적을 모아 둬요. 졸업 요건: 석사 공저 1편 이상, 박사 · 통합 제1저자 3편(IF>10이면 2편).'),
    CV_TYPES.map(t => {
      const list = db.cv.filter(x => x.type === t).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return panel(`${t} (${list.length})`,
        list.length ? h('div', 'cv-list', list.map(x => h('button', { class: 'cv-item', onclick: () => cvForm(x) },
          h('b', null, x.title),
          h('small', null, [x.venue, x.role, x.date].filter(Boolean).join(' · ')),
          x.link ? h('a', { href: x.link, target: '_blank', rel: 'noopener', onclick: e => e.stopPropagation() }, '링크 ↗') : null)))
          : null,
        h('button', { class: 'btn small', onclick: () => cvForm(null, t) }, `+ ${t} 추가`));
    }));
}
