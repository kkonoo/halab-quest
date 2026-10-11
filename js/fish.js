'use strict';
// 투고 낚시터: 실제 투고 기록을 낚시로 보여 줘요 (점수 · 순위 없음)
// 원고 하나 = db.subs의 항목 { id, title, casts: [{ journal, events: [{ s, d, note }] }], cvId }
// 던지기(cast) 하나 = 저널 하나에 투고한 기록. Reject 되면 새 저널로 다시 던져서 casts에 하나 더 쌓여요

const FISH_STATUS = {
  submitted: { label: '투고', next: ['review', 'rejected'] },
  editor: { label: '에디터 검토', next: ['review', 'rejected'] }, // 지금은 고를 수 없음 (예전 기록을 보여 주려고만 남김)
  review: { label: '리뷰 중', next: ['revision', 'accepted', 'rejected'] },
  revision: { label: '수정 요청', next: ['resubmitted'] },
  resubmitted: { label: '재투고', next: ['review', 'revision', 'accepted', 'rejected'] },
  accepted: { label: 'Accept', next: [] },
  rejected: { label: 'Reject', next: [] },
};
const DAY = 86400000;
const dayNum = s => Math.floor(Date.parse(s) / DAY);
const lastCast = sub => sub.casts[sub.casts.length - 1];
const lastEvent = cast => cast.events[cast.events.length - 1];
const subStatus = sub => lastEvent(lastCast(sub)).s;
// 이 저널에 던진 뒤 며칠 (끝났으면 결정일까지)
const castDays = cast => (subDoneCast(cast) ? dayNum(lastEvent(cast).d) : dayNum(today())) - dayNum(cast.events[0].d);
const subDoneCast = cast => ['accepted', 'rejected'].includes(lastEvent(cast).s);
const totalDays = sub => dayNum(subStatus(sub) === 'accepted' ? lastEvent(lastCast(sub)).d : today()) - dayNum(sub.casts[0].events[0].d);

let fishPick = null, fishTip = '';

// 물고기 색 5가지(img/char/fish-1~5.png). 원고 id로 정해서 같은 원고는 늘 같은 색
const fishImg = (sub, cls, alt = '') => h('img', { class: cls, alt, src: `img/char/fish-${[...sub.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 5 + 1}.png` });

function fishTips() { return QUESTS.get('ch4-submit')?.fishTips || ['기다리는 동안 다음 분석을 준비해요.']; }

function castForm(sub) {
  const again = !!sub;
  openForm({
    title: again ? `다시 던지기 · ${sub.title}` : '새 원고 던지기',
    fields: [
      ...(again ? [] : [{ key: 'title', label: '원고 이름 (짧게)', placeholder: '예: FSGS snRNA-seq' }]),
      { key: 'journal', label: '저널', placeholder: '예: Nature Communications' },
      { key: 'd', label: '투고일', type: 'date', value: today() },
    ],
    saveLabel: '던지기',
    onSave: v => {
      if (!v.journal || (!again && !v.title)) return false;
      const cast = { journal: v.journal, events: [{ s: 'submitted', d: v.d || today() }] };
      if (again) sub.casts.push(cast);
      else { sub = { id: uid(), title: v.title, casts: [cast] }; db.subs.push(sub); }
      fishPick = sub.id;
      fishTip = again ? '다시 던졌어요. 리뷰 코멘트로 다듬은 원고라 더 단단해요.' : '던졌어요! 이제 기다리는 동안 다음 분석을 준비해요.';
      persist(); render();
    },
  });
}

function statusForm(sub, s) {
  openForm({
    title: `${sub.title} → ${FISH_STATUS[s].label}`,
    fields: [
      { key: 'd', label: '날짜', type: 'date', value: today() },
      s === 'revision' ? { key: 'note', label: '수정 요청 종류', type: 'select', options: ['Major revision', 'Minor revision'] }
        : { key: 'note', label: '메모 (비워도 돼요)', placeholder: s === 'rejected' ? '예: desk reject, 리뷰어 2명 부정적' : '' },
    ],
    onSave: v => {
      lastCast(sub).events.push({ s, d: v.d || today(), ...(v.note ? { note: v.note } : {}) });
      fishTip = { accepted: '낚았어요! 축하해요 🎉 My CV에도 넣어 두세요.', rejected: '빈 바늘이에요. 괜찮아요, 다음 저널로 다시 던져요.',
        revision: '입질이 왔어요! 지적마다 감사 → 한 일 → 바뀐 위치 순서로 답해요.', review: '리뷰어에게 갔어요. 찌가 움직이기 시작했어요.' }[s] || '';
      persist(); render();
      if (s === 'accepted') toast('Accept! 🐟');
    },
  });
}

function addToCV(sub) {
  const cast = lastCast(sub);
  const item = { id: uid(), type: '논문', title: sub.title, venue: cast.journal, role: '', date: lastEvent(cast).d, link: '' };
  db.cv.push(item);
  sub.cvId = item.id;
  persist(); render();
  toast('My CV에 넣었어요. 정식 논문 제목과 역할은 My CV에서 고쳐 주세요.', 3500);
}

function bobber(sub) {
  const s = subStatus(sub), cast = lastCast(sub);
  return h('button', { class: `bobber s-${s}${sub.id === fishPick ? ' on' : ''}`, onclick: () => { fishPick = sub.id; const t = fishTips(); fishTip = t[Math.floor(Math.random() * t.length)]; render(); } },
    h('span', 'line'),
    s === 'rejected' ? h('img', { class: 'hook', src: 'img/char/hook.png', alt: '빈 바늘' }) : h('img', { class: 'float', src: 'img/char/float.png', alt: '찌' }),
    s === 'revision' ? fishImg(sub, 'fish-on', '입질') : null,
    h('span', 'tagline', h('b', null, sub.title), h('small', null, `${cast.journal} · ${FISH_STATUS[s].label.replace(/ /g, '\u00a0')}`), h('em', null, `D+${castDays(cast)}`)));
}

function viewFish() {
  setTitle('4장. 논문의 탑', '투고 낚시터');
  const pond = db.subs.filter(x => subStatus(x) !== 'accepted');
  const net = db.subs.filter(x => subStatus(x) === 'accepted');
  const pick = db.subs.find(x => x.id === fishPick) || pond[0] || net[0];
  return h('div', 'screen fish c-ch4',
    h('div', 'fish-main',
      h('div', 'scene pond', glowLayer('fish-pond.jpg'),
        h('span', 'place', '투고 낚시터'),
        fishTip ? h('div', 'bubble', fishTip) : null,
        h('div', 'water', pond.length ? pond.map(bobber) : h('p', 'empty-pond', '아직 던진 원고가 없어요. 투고했다면 던져 보세요!')),
        h('div', 'walker', studentImg('back'), h('img', { class: 'sprite rod', src: 'img/char/rod.png', alt: '낚싯대' }), catIdle())),
      h('div', 'row', h('button', { class: 'btn primary', onclick: () => castForm() }, '새 원고 던지기'), h('a', { class: 'btn', href: '#/q/ch4-submit' }, '← 투고와 리뷰'))),
    h('div', 'fish-side',
      pick ? fishDetail(pick) : panel('낚시 일지', h('p', 'hint', '원고를 던지면 저널 · 상태 · 기다린 날수가 여기에 쌓여요.')),
      panel(['어망 ', h('img', { class: 'head-fish', src: 'img/char/fish-1.png', alt: '' }), ` ${net.length}`],
        net.length ? h('div', 'net', net.map(x => h('button', { class: 'net-item', onclick: () => { fishPick = x.id; fishTip = ''; render(); } },
          fishImg(x, 'big-fish'), h('b', null, x.title), h('small', null, `${lastCast(x).journal} · 총 ${totalDays(x)}일 · ${x.casts.length}번 던짐`))))
          : h('p', 'hint', 'Accept 된 원고가 여기에 모여요.'))),
    h('div', 'q-dialog', dialogBox(['투고하고 기다리는 시간도 연구의 일부예요.', '찌만 보고 있지 말고, 기다리는 동안 다음 분석을 준비해요.', '리젝되면 리뷰 코멘트로 다듬어서 다시 던지면 돼요.'], 'cheer')));
}

function fishDetail(sub) {
  const s = subStatus(sub), cast = lastCast(sub);
  return panel(`낚시 일지 · ${sub.title}`,
    h('div', 'fish-now', h('span', `status-chip s-${s}`, FISH_STATUS[s].label), h('b', null, cast.journal), h('span', null, `D+${castDays(cast)}`)),
    FISH_STATUS[s].next.length ? h('div', 'row', h('span', 'hint', '상태 바꾸기:'), FISH_STATUS[s].next.map(n => h('button', { class: `btn small s-${n}`, onclick: () => statusForm(sub, n) }, FISH_STATUS[n].label))) : null,
    s === 'rejected' ? h('div', 'row', h('button', { class: 'btn primary', onclick: () => castForm(sub) }, '다른 저널로 다시 던지기')) : null,
    s === 'accepted' ? h('div', 'row', sub.cvId && db.cv.some(c => c.id === sub.cvId) ? h('a', { class: 'btn', href: '#/cv' }, '📜 My CV에 들어 있어요')
      : h('button', { class: 'btn primary', onclick: () => addToCV(sub) }, '📜 My CV에 넣기')) : null,
    h('ol', 'fish-log', sub.casts.map((c, i) => h('li', null,
      h('b', null, `${i + 1}번째 · ${c.journal}`), h('small', null, ` ${castDays(c)}일`),
      h('div', 'log-events', c.events.map(e => h('span', `ev s-${e.s}`, `${FISH_STATUS[e.s].label} ${e.d.slice(5).replace('-', '/')}${e.note ? ` (${e.note})` : ''}`)))))),
    h('div', 'row end',
      h('button', { class: 'btn small', onclick: () => { const t = prompt('원고 이름', sub.title); if (t?.trim()) { sub.title = t.trim(); persist(); render(); } } }, '이름 고치기'),
      h('button', { class: 'btn small', onclick: () => { const e = lastCast(sub).events; if (e.length > 1 && confirm(`마지막 상태(${FISH_STATUS[e[e.length - 1].s].label})를 되돌릴까요?`)) { e.pop(); persist(); render(); } else if (e.length === 1 && sub.casts.length > 1 && confirm('마지막 던지기를 되돌릴까요?')) { sub.casts.pop(); persist(); render(); } } }, '되돌리기'),
      h('button', { class: 'btn small danger', onclick: () => { if (confirm(`'${sub.title}' 기록을 지울까요?`)) { db.subs = db.subs.filter(x => x !== sub); fishPick = null; persist(); render(); } } }, '삭제')));
}
