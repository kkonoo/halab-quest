// 오프라인에서도 열리게 하는 서비스 워커.
// 온라인이면 항상 새 파일을 받고(업데이트 바로 반영), 오프라인이면 저장해 둔 파일을 씀.
// 같은 주소(kkonoo.github.io)의 다른 앱과 캐시 저장소를 같이 쓰므로 이름을 다르게, 남의 캐시는 지우지 않기
const CACHE = 'halab-quest-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/md.js', 'js/app.js', 'js/world.js', 'js/quest.js', 'js/journey.js', 'js/admin.js', 'js/fish.js', 'js/sync.js', 'js/firebase-config.js', /* 새 js 파일은 여기에 꼭 추가 */
  'data/ch1.json', 'data/ch2.json', 'data/ch3.json', 'data/ch4.json', 'data/cards/ch1-lab.md', 'data/cards/ch1-compass.md', 'data/cards/ch1-guide.md', 'data/cards/ch1-papers.md', 'data/cards/ch1-wiki.md', 'data/cards/ch2-topic.md', 'data/cards/ch2-gap.md', 'data/cards/ch2-hypo.md', 'data/cards/ch2-design.md', 'data/cards/ch2-proposal.md', 'data/cards/ch2-meeting.md', 'data/cards/ch3-presentation.md', 'data/cards/ch3-figure.md', 'data/cards/ch3-ai.md', 'data/cards/ch4-conference.md',
  'img/char/intern-f-front.png', 'img/char/intern-f-back.png', 'img/char/intern-m-front.png', 'img/char/intern-m-back.png', 'img/char/grad-f-front.png', 'img/char/grad-f-back.png', 'img/char/grad-m-front.png', 'img/char/grad-m-back.png',
  'img/char/cat-sit.png', 'img/char/cat-walk.png', 'img/char/rod.png', 'img/char/float.png', 'img/char/hook.png', 'img/char/fish-1.png', 'img/char/fish-2.png', 'img/char/fish-3.png', 'img/char/fish-4.png', 'img/char/fish-5.png', 'img/char/prof-front.png', 'img/char/prof-point.png', 'img/char/prof-tablet.png', 'img/ui/panel.png', 'img/ui/button.png', 'img/ui/header.png', 'img/ui/stamp-book.png', 'img/ui/stamp-dna.png', 'img/ui/stamp-stats.png', 'img/ui/stamp-pc.png', 'img/ui/stamp-micro.png', 'img/ui/stamp-empty.png', 'img/ui/icon-map.png', 'img/ui/icon-bag.png', 'img/ui/icon-menu.png', 'img/ui/icon-cv.png', 'img/ui/medal-ch1.png', 'img/ui/medal-ch2.png', 'img/ui/medal-ch3.png', 'img/ui/medal-ch4.png', 'img/prof-default.png', 'img/prof-smile.png', 'img/prof-explain.png', 'img/prof-cheer.png',
  'icons/app-192.png', 'icons/app-512.png', 'icons/app-maskable-192.png', 'icons/app-maskable-512.png',
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { cacheName: CACHE }))
  );
});
