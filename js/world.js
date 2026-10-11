'use strict';
// 월드맵 · 챕터 맵 · 챕터 완료 화면

function viewWorld() {
  setTitle('HaLab Quest', 'HaLab World Map');
  const u = window.cloud?.user;
  return h('div', 'screen world',
    h('div', 'map-area world-map',
      h('div', 'map-grid', CHAPTERS.map(ch => {
        const c = chapterCount(ch);
        return h('a', { class: `region r-${ch.id}`, href: `#/ch/${ch.id}`, style: ch.mapPos ? `left:${ch.mapPos[0]}%;top:${ch.mapPos[1]}%` : null },
          h('b', null, `${ch.no}장. ${ch.title}`),
          h('small', null, ch.region),
          h('span', 'region-prog', h('span', { class: 'ck', title: '학습 완료' }), ` ${c.check} / ${c.total}`, c.star ? `  ★ ${c.star}` : ''),
          ch.ready ? null : h('span', 'chip', '준비 중'));
      }),
      // 가운데 섬 = 투고 낚시터
      h('a', { class: 'sign pond-sign', href: '#/fish' }, h('b', 'sign-text', '투고 낚시터')))),
    h('div', 'bottom-row',
      dialogBox(['안녕하세요. 반가워요! 여기는 HaLab이에요.', '연구는 긴 여정이지만, 작은 탐험부터 시작하면 누구나 해낼 수 있어요.',
        '가고 싶은 곳을 골라보세요. 순서는 추천일 뿐, 어디든 먼저 가도 돼요.'], 'smile'),
      h('div', 'side-links',
        h('a', { class: 'side-link', href: '#/journey' }, h('img', { class: 'sl-icon', src: 'img/ui/icon-bag.png', alt: '' }), 'My Journey'),
        h('a', { class: 'side-link', href: '#/cv' }, h('img', { class: 'sl-icon', src: 'img/ui/icon-cv.png', alt: '' }), 'My CV'),
        window.cloud && !u ? h('button', { class: 'side-link login', onclick: () => window.cloud.login() }, '🔑 Google 로그인') : null)));
}

function viewChapter(ch) {
  setTitle(`${ch.no}장. ${ch.title}`, ch.subtitle);
  const prev = CHAPTERS[ch.no - 2], next = CHAPTERS[ch.no];
  const firstTodo = ch.quests.find(q => !prog(q.id).check) || ch.quests[0];
  return h('div', `screen chapter c-${ch.id}`,
    h('div', { class: `scene chapter-scene${ch.bg ? ' has-bg' : ''}`, style: ch.bg ? `background-image:url(${ch.bg})` : null },
      // 이름표는 한 줄: '번호. 장소' (장소가 없으면 '번호. 퀘스트'), 그림이 장소를 보여 주므로 이모지 없이
      // 퀘스트에 mapPos([가로%, 세로%])가 있으면 그림 속 건물 위에 이름표를 올림 (월드맵처럼), 없으면 위쪽에 나란히
      h('div', `signs${ch.quests.some(q => q.mapPos) ? ' pinned' : ''}`, ch.quests.map((q, i) =>
        h('a', { class: 'sign', href: `#/q/${q.id}`, title: q.title, style: q.mapPos ? `left:${q.mapPos[0]}%;top:${q.mapPos[1]}%` : null },
          h('b', 'sign-text', `${i + 1}. ${q.place || q.title}`),
          prog(q.id).check ? h('span', 'mk ok', '✓') : null))),
      prev ? h('a', { class: 'way left', href: `#/ch/${prev.id}` }, `← ${prev.no}장. ${prev.title}`) : null,
      next ? h('a', { class: 'way right', href: `#/ch/${next.id}` }, `${next.no}장. ${next.title} →`) : null,
      h('div', 'walker', studentImg('back'), h('img', { class: 'sprite cat', src: 'img/char/cat-walk.png', alt: '고양이' }))),
    h('div', 'bottom-row',
      dialogBox(ch.intro, 'explain'),
      h('section', 'panel quest-list',
        h('h2', 'panel-head', `${ch.no}장의 주요 퀘스트`),
        h('ol', 'qlist', ch.quests.map((q, i) => h('li', null, h('a', { href: `#/q/${q.id}` },
          h('span', 'num', i + 1), q.title, h('span', 'qi', q.icon),
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
    d.bg ? h('div', { class: 'scene done-scene has-bg', style: `background-image:url(${d.bg})` },
      h('div', 'banner', h('h1', null, '✦ ', d.title, ' ✦'), h('p', null, d.sub)),
      h('div', 'walker', h('img', { class: 'sprite', src: 'img/char/prof-point.png', alt: '교수님' }), studentImg('back'), h('img', { class: 'sprite cat', src: 'img/char/cat-sit.png', alt: '고양이' })))
      : h('div', 'banner', h('h1', null, '✦ ', d.title, ' ✦'), h('p', null, d.sub)),
    h('div', 'done-grid',
      panel(`${ch.no}장에서 해낸 일`,
        h('div', 'flow', ch.quests.map((q, i) => [i ? h('span', 'arrow', '→') : null,
          h('a', { class: 'step', href: `#/q/${q.id}` }, h('span', 'step-icon', q.icon), h('b', null, q.title),
            prog(q.id).check ? h('span', 'mk ok big', '✓') : h('span', 'mk empty big', '○'))]))),
      panel(`나의 ${ch.no}장 기록`,
        h('div', 'stat', h('span', 'mk ok', '✓'), '학습 완료', h('b', null, `${c.check} / ${c.total}`)),
        h('div', 'stat', h('span', 'mk star', '★'), '실전 적용', h('b', null, c.star)),
        d.stamps ? h('div', 'stat', h('span', 'mk', '📘'), '교재 스탬프', h('b', null, stampCount())) : null,
        h('p', 'hint center', 'My Journey에 저장됐어요'),
        h('div', 'badge', medal(ch), h('b', null, d.badge)),
        d.cvNote ? h('p', 'hint center', h('a', { href: '#/cv' }, d.cvNote)) : null)),
    h('div', 'bottom-row',
      dialogBox(d.lines, 'smile'),
      h('div', 'btn-col',
        next ? bigBtn(ro(`${next.no}장. ${next.title}`), `#/ch/${next.id}`) : bigBtn('My Journey 전체 보기', '#/journey'),
        next ? h('a', { class: 'btn', href: `#/ch/${ch.id}` }, `${ch.title} 다시 둘러보기`) : h('a', { class: 'btn', href: '#/' }, '월드맵으로'))));
}
