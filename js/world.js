'use strict';
// 월드맵 · 챕터 맵 · 챕터 완료 화면

function viewWorld() {
  setTitle('HaLab Quest', 'HaLab World Map');
  const u = window.cloud?.user;
  return h('div', 'screen world',
    h('div', 'map-area',
      h('div', 'map-grid', CHAPTERS.map(ch => {
        const c = chapterCount(ch);
        return h('a', { class: `region r-${ch.id}`, href: `#/ch/${ch.id}` },
          h('span', 'region-icon', ch.icon),
          h('b', null, `${ch.no}장. ${ch.title}`),
          h('small', null, ch.region),
          h('span', 'region-prog', `✓ ${c.check} / ${c.total}`, c.star ? `  ★ ${c.star}` : ''),
          ch.ready ? null : h('span', 'chip', '준비 중'));
      }))),
    h('div', 'bottom-row',
      dialogBox(['안녕하세요. 반가워요! 여기는 HaLab이에요.', '연구는 긴 여정이지만, 작은 탐험부터 시작하면 누구나 해낼 수 있어요.',
        '가고 싶은 곳을 골라보세요. 순서는 추천일 뿐, 어디든 먼저 가도 돼요.']),
      h('div', 'side-links',
        h('a', { class: 'side-link', href: '#/journey' }, '🎒 My Journey'),
        h('a', { class: 'side-link', href: '#/cv' }, '📜 My CV'),
        window.cloud && !u ? h('button', { class: 'side-link login', onclick: () => window.cloud.login() }, '🔑 Google 로그인') : null)));
}

function viewChapter(ch) {
  setTitle(`${ch.no}장. ${ch.title}`, ch.subtitle);
  const prev = CHAPTERS[ch.no - 2], next = CHAPTERS[ch.no];
  const firstTodo = ch.quests.find(q => !prog(q.id).check) || ch.quests[0];
  return h('div', `screen chapter c-${ch.id}`,
    h('div', 'scene chapter-scene',
      h('div', 'signs', ch.quests.map((q, i) => h('a', { class: 'sign', href: `#/q/${q.id}` },
        h('span', 'sign-icon', q.icon), h('b', null, q.place || q.title), h('small', null, `${i + 1}. ${q.title}`),
        prog(q.id).check ? h('span', 'sign-done', '✓') : null))),
      prev ? h('a', { class: 'way left', href: `#/ch/${prev.id}` }, `← ${prev.no}장. ${prev.title}`) : null,
      next ? h('a', { class: 'way right', href: `#/ch/${next.id}` }, `${next.no}장. ${next.title} →`) : null,
      h('div', 'walker', '🧑‍🎓', h('span', 'cat', '🐈'))),
    h('div', 'bottom-row',
      dialogBox(ch.intro),
      h('section', 'panel quest-list',
        h('h2', 'panel-head', `${ch.no}장의 주요 퀘스트`),
        h('ol', 'qlist', ch.quests.map((q, i) => h('li', null, h('a', { href: `#/q/${q.id}` },
          h('span', 'num', i + 1), h('span', 'qi', q.icon), q.title,
          h('span', 'marks', prog(q.id).check ? h('span', 'mk ok', '✓') : h('span', 'mk empty', '○'), prog(q.id).star ? h('span', 'mk star', '★') : null))))),
        h('div', 'row',
          bigBtn(`${ch.no}장. ${ch.title} 시작하기`, `#/q/${firstTodo.id}`),
          h('a', { class: 'btn', href: `#/done/${ch.id}` }, `${ch.no}장 완료 화면`)))));
}

function viewDone(ch) {
  setTitle(`${ch.no}장. ${ch.title}`, `${ch.no}장 완료`);
  const c = chapterCount(ch), d = ch.done;
  // My Journey에 남기기 (숫자가 바뀌었을 때만 저장)
  const rec = db.chapterDone[ch.id];
  if (!rec || rec.check !== c.check || rec.star !== c.star) { db.chapterDone[ch.id] = { at: Date.now(), check: c.check, star: c.star }; persist(); }
  const next = d.next && CHAPTERS.find(x => x.id === d.next);
  return h('div', `screen done c-${ch.id}`,
    h('div', 'banner', h('h1', null, '✦ ', d.title, ' ✦'), h('p', null, d.sub)),
    h('div', 'done-grid',
      panel(`${ch.no}장에서 해낸 일`,
        h('div', 'flow', ch.quests.map((q, i) => [i ? h('span', 'arrow', '→') : null,
          h('a', { class: 'step', href: `#/q/${q.id}` }, h('span', 'step-icon', q.icon), h('b', null, q.title),
            prog(q.id).check ? h('span', 'mk ok big', '✓') : h('span', 'mk empty big', '○'))]))),
      panel(`나의 ${ch.no}장 기록`,
        h('div', 'stat', h('span', 'mk ok', '✓'), '학습 완료', h('b', null, `${c.check} / ${c.total}`)),
        h('div', 'stat', h('span', 'mk star', '★'), '실전 적용', h('b', null, c.star)),
        h('p', 'hint center', 'My Journey에 저장됐어요'),
        h('div', 'badge', h('span', 'medal', d.badgeIcon || ch.icon), h('b', null, d.badge)),
        d.cvNote ? h('p', 'hint center', h('a', { href: '#/cv' }, d.cvNote)) : null)),
    h('div', 'bottom-row',
      dialogBox(d.lines),
      h('div', 'btn-col',
        next ? bigBtn(ro(`${next.no}장. ${next.title}`), `#/ch/${next.id}`) : bigBtn('My Journey 전체 보기', '#/journey'),
        next ? h('a', { class: 'btn', href: `#/ch/${ch.id}` }, `${ch.title} 다시 둘러보기`) : h('a', { class: 'btn', href: '#/' }, '월드맵으로'))));
}
