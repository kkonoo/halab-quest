'use strict';
// 진행도 보기 (교수님만): Lab Manager 랩 문서의 멤버(학생 이메일) 각자의 진행도를 읽기만 해요
// 읽기는 sync.js의 window.cloud.loadStudents() → [{ email, name, updatedAt, db }]

let adminData = null, adminLoading = false, adminPick = null;

function loadAdmin() {
  if (adminLoading) return;
  adminLoading = true;
  window.cloud.loadStudents()
    .then(list => { adminData = list; })
    .catch(e => { console.error(e); adminData = { error: e.code || e.message }; })
    .finally(() => { adminLoading = false; if (location.hash.startsWith('#/admin')) render(); });
}

function countIn(d, ch) {
  let check = 0, star = 0;
  for (const q of ch.quests) { const p = d.progress?.[q.id] || {}; if (p.check) check++; if (p.star) star++; }
  return { check, star };
}

function viewAdmin() {
  setTitle('진행도 보기', '교수님 화면');
  if (!window.cloud?.isPI) return panel('진행도 보기', h('p', 'hint', 'Lab Manager에서 랩을 만든 교수님 계정으로 로그인하면 보여요.'));
  if (!adminData) { loadAdmin(); return panel('진행도 보기', h('p', 'hint', '학생 진행도를 불러오는 중이에요…')); }
  if (adminData.error) return panel('진행도 보기', h('p', 'hint', `불러오지 못했어요 (${adminData.error}). Firestore 규칙에 quest 부분을 붙여 넣었는지 확인해 주세요.`));

  const list = adminData;
  const pick = list.find(s => s.email === adminPick);
  return h('div', 'screen admin',
    panel(`학생 ${list.length}명`,
      h('p', 'hint', '학생 명단은 Lab Manager의 랩 멤버 목록을 그대로 써요. 아직 로그인하지 않은 학생은 비어 있어요.'),
      h('div', 'table-wrap', h('table', 'admin-table',
        h('thead', null, h('tr', null, h('th', null, '학생'), CHAPTERS.map(ch => h('th', null, `${ch.no}장`)), h('th', null, '투고 중'), h('th', null, '발표'), h('th', null, 'CV'), h('th', null, '최근'))),
        h('tbody', null, list.map(s => h('tr', { class: s.email === adminPick ? 'on' : null, onclick: () => { adminPick = s.email; render(); } },
          h('td', null, h('b', null, s.name || s.email.split('@')[0]), h('small', null, s.email)),
          CHAPTERS.map(ch => { const c = countIn(s.db, ch); return h('td', null, `✓ ${c.check}/${ch.quests.length}`, c.star ? h('span', 'star-txt', ` ★${c.star}`) : null); }),
          h('td', null, (s.db.subs || []).filter(x => !['accepted', 'rejected'].includes(subStatus(x))).map(x => h('div', null, `${FISH_STATUS[subStatus(x)].label} D+${castDays(lastCast(x))}`)), (s.db.subs || []).every(x => ['accepted', 'rejected'].includes(subStatus(x))) ? '—' : null),
          h('td', null, s.db.records?.length || 0),
          h('td', null, s.db.cv?.length || 0),
          h('td', null, s.updatedAt ? fmtDate(s.updatedAt) : '—')))))),
      h('div', 'row end', h('button', { class: 'btn', onclick: () => { adminData = null; render(); } }, '새로고침'))),
    pick ? adminDetail(pick) : null);
}

function adminDetail(s) {
  const d = s.db;
  return panel(`${s.name || s.email} 자세히`,
    CHAPTERS.map(ch => h('div', 'admin-ch',
      h('h3', null, `${ch.icon} ${ch.no}장. ${ch.title}`),
      h('ul', 'admin-q', ch.quests.map(q => {
        const p = d.progress?.[q.id] || {};
        return h('li', null, h('span', `mk ${p.check ? 'ok' : 'empty'}`, p.check ? '✓' : '○'), p.star ? h('span', 'mk star', '★') : null, ' ', q.title,
          p.check ? h('small', null, ` ${fmtDate(p.check)}`) : null, p.note ? h('em', null, ` — ${p.note}`) : null, p.kw ? h('em', null, ` — 관심 키워드: ${p.kw}`) : null);
      })))),
    d.subs?.length ? [h('h3', null, '🎣 투고 낚시터'), h('ul', null, d.subs.map(x => h('li', null, h('b', null, x.title), ` · ${lastCast(x).journal} · ${FISH_STATUS[subStatus(x)].label} · D+${castDays(lastCast(x))}`, x.casts.length > 1 ? h('small', null, ` (${x.casts.length}번째 저널: ${x.casts.map(c => c.journal).join(' → ')})`) : null)))] : null,
    d.records?.length ? [h('h3', null, '🎤 발표 기록'), h('ul', null, [...d.records].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(r => h('li', null, `${r.date} · ${r.kind} · ‘${r.text}’`)))] : null,
    d.figcards?.length ? [h('h3', null, '🖼️ Figure 순서 카드'), h('ol', null, d.figcards.map(f => h('li', null, f.text)))] : null,
    d.cv?.length ? [h('h3', null, '📜 My CV'), h('ul', null, d.cv.map(x => h('li', null, `[${x.type}] ${x.title}${x.venue ? ` · ${x.venue}` : ''}${x.role ? ` · ${x.role}` : ''}`)))] : null);
}
