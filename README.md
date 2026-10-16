# HaLab Quest

HaLab 연구실 인턴 · 대학원생 온보딩용 쯔꾸르풍 웹 RPG예요. 연구의 길(분야 탐색 → 주제 찾기 → 연구하기 → 첫 논문)을 퀘스트로 따라가며, 기존 연구실 자료(Wiki · 교재 · Lab Manager · Lab manual)로 공부하고 진행도를 기록해요.

주소: https://kkonoo.github.io/halab-quest/

## 화면

| 화면 | 하는 일 |
|---|---|
| 월드맵 | 1~4장으로 가는 지도. 순서는 추천일 뿐, 어디든 먼저 가도 돼요. 가운데 섬은 투고 낚시터 |
| 챕터 맵 | 그 장의 퀘스트 목록과 진행도 |
| 퀘스트 | 설명 · 가이드 카드 · 자료 링크 · ✓ 학습 완료 · ★ 실전 적용(선택) |
| 챕터 완료 | 그 장에서 해낸 일, ✓·★ 개수, 수료 배지 (그 장 퀘스트를 모두 ✓ 학습 완료해야 받음. 덜 했으면 회색 배지와 남은 개수) |
| My Journey (🎒 가방) | 챕터별 진행도와 날짜순 기록 |
| My CV | 실제 논문 · 학회 발표 · 수상 실적 |
| 진행도 보기 | 교수님만: 랩 멤버 학생들의 진행도 (읽기만) |

퀴즈 · 점수 · 잠금은 없어요. ✓는 자료를 읽고 따라 해봤을 때, ★는 실제 연구에 써봤을 때 남겨요.

## 처음 쓸 때

1. 주소로 들어가서 위 오른쪽 **로그인**으로 Google 계정에 로그인해요 (로그인 안 해도 이 브라우저에는 저장돼요).
2. **메뉴 → 내 이름**에 이름을 적어요. 교수님 진행도 화면에 이 이름이 보여요.
3. 교수님이 진행도를 보려면, 학생 Google 이메일이 **Lab Manager의 랩 멤버 목록**에 들어 있어야 해요.

## 내용 고치기

퀘스트 문구와 링크는 화면 코드가 아니라 데이터 파일에 있어요.

| 파일 | 내용 |
|---|---|
| `data/ch1.json` ~ `data/ch4.json` | 챕터 소개 · 퀘스트 목록 · 설명 · 정보 패널 · 핵심 UI · 자료 링크 · ✓/★ 문구 · 교수님 대사 |
| `data/cards/*.md` | 게임 안 가이드 카드 (`## 1. 제목` 하나가 카드 한 장 = 퀘스트 메뉴 한 칸) |

퀘스트 항목에서 쓰는 칸: `overview`(개요) · `sections` 또는 `cards`(메뉴 칸) · `info`(우측 정보 패널) · `widget`(아래) · `links`(`url` 바깥 링크 / `quest` 다른 퀘스트 / `href` 게임 안 주소 / `note` 글만) · `warn` · `records`(발표 기록 종류) · `check` · `star` · `noStar` · `dialog` · `bubble` · `face` · `pose` · `bg`(장면 그림 주소, 그림이 생기면) · `mapPos`(챕터 맵 그림 속 이름표 위치 [가로%, 세로%], 이름표 가운데 기준. 없으면 이름표를 위쪽에 나란히).

장 항목의 그림 칸: `bg`(장 지도) · `mapPos`(월드맵 이름판 위치 [가로%, 세로%]) · `walkerPos`(장 지도에서 학생 · 고양이가 설 자리 [가로%, 발 위치 세로%], 그림 속 빈 광장 · 길 위로) · `done.bg`(완료 화면) · `done.badgeImg`(수료 메달 그림).

`widget` 종류:
- `flow` 흐름 — 칸마다 `icon` `label` `sub`, 눌러서 갈 곳 `url`(새 탭) 또는 `href`(게임 안), 나란한 두 길은 `{ "branch": [칸, 칸] }`
- `figcards` Figure 순서 카드 (4장)
- `lights` AI 신호등 — `lights: [{ color: green|yellow|red, label, items }]`
- `compass` 호기심 나침반 — `dirs`(방향마다 icon · label · text · links), `order`(위 · 오른쪽 · 아래 · 왼쪽 순서), `questions: [{ q, a: { 방향 키: 보기 } }]`, `paper`(결과 아래 링크). 답과 관심 키워드는 진행도에 `ans` · `kw`로 저장 (채점 없음)
- `passport` 교재 여권 — `groups: [{ label, icon, stamp, color, books: [{ id, name, url, desc, note }] }]` (`note` = 이름 아래 작은 안내, 예: '생물 전공은 건너뛰어도 돼요' · `stamp` = 찍었을 때 스탬프 그림 `img/ui/stamp-*.png`, 안 찍은 자리는 `stamp-empty.png`). 분야 하나 = 여권 한 쪽, 교재 하나 = 동그라미 스탬프 하나. 적힌 순서가 추천 순서예요. 교재를 더하거나 빼려면 여기만 고쳐요 (`id`를 바꾸면 그 교재 도장 기록이 사라져요)

`sections` 칸에 `missions: [{ text, ask, station }]`을 넣으면 판단 미션 카드가 돼요 (채점 없음). `station`은 `widget.steps`의 순서(0부터)이고, 그 칸의 `url`이 '교재에서 확인' 버튼이 돼요.
**통계 실습실의 교재 주소는 `data/ch3.json` → `ch3-stats` → `widget.steps[].url`** 네 개예요. 가설검정 기초 · 결과 검증은 [1. Basic Statistics](https://kkonoo.github.io/1_Basic_Statistics/)의 6장 · 10장으로 연결해요. 교재가 바뀌면 여기와 `links`만 바꾸면 돼요.

## 데이터는 어디에

- 이 브라우저: IndexedDB `halab-quest` (안 되면 localStorage `halab-quest`)
- 로그인하면 Firestore에 자동 동기화돼요. Firebase 프로젝트는 **Lab Manager와 같은 `lab-manager-knumed`** 예요 (랩 멤버 목록을 같이 쓰려고).
  - `quest/{학생 이메일}` 요약 (이름, 최근 활동)
  - `quest/{학생 이메일}/rec/{키}` 기록 하나 = 문서 하나 (`p:` 진행도 · `r:` 발표 기록 · `c:` CV · `d:` 챕터 완료 · `s:` 낚시 원고 · `f` Figure 카드 · `n` 이름 · `a` 캐릭터)
  - 교재 여권 스탬프는 진행도에 `p:tb:{교재 id}`로 들어가요 (퀘스트가 아니라서 ✓·★ 개수에는 안 세요)
  - `labs/{교수님 uid}` Lab Manager 랩 문서 — 여기서는 멤버 목록을 읽기만 해요
- 보안 규칙: `firestore.rules` (Lab Manager 규칙 + quest 부분). 학생은 자기 기록만 읽고 쓰고, 교수님은 자기 랩 멤버의 기록을 읽기만 해요. Firebase 콘솔 → Firestore Database → 규칙에 **파일 전체**를 붙여 넣어요.
- 로그아웃하면 이 기기에 남은 기록은 지워요 (계정에는 그대로 있어요). 연구실 공용 PC에서 다음 사람과 섞이지 않게요.
- 메뉴 → 데이터: 백업 파일 저장 · 불러오기

## 개발

```
powershell tools/serve.ps1     # http://localhost:8767/
```

빌드 없음. `index.html` + `css/style.css` + `js/*.js`. 새 js · 데이터 파일은 `sw.js`의 `SHELL`에도 넣어요.

## 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 헤더(지도 · 가방 · 메뉴), 메뉴 창, 입력 창 |
| `css/style.css` | 쯔꾸르풍 화면 (양피지 패널 · 나무 테두리 · 붉은 버튼), 900px 아래는 한 줄 배치 |
| `js/app.js` | 저장, 데이터 파일 읽기, 화면 이동(`#/…`), 공통 도구, 메뉴 |
| `js/md.js` | 가이드 카드용 작은 마크다운 변환기 |
| `js/world.js` | 월드맵 · 챕터 맵 · 챕터 완료 |
| `js/quest.js` | 퀘스트 화면 (모든 퀘스트를 한 틀로) |
| `js/journey.js` | My Journey · My CV |
| `js/admin.js` | 교수님 진행도 보기 |
| `js/sync.js` | Google 로그인 · Firestore 동기화 · 교수님 확인 |
| `js/firebase-config.js` | Firebase 설정 (null이면 로그인 꺼짐) |
| `firestore.rules` | 보안 규칙 (Lab Manager와 같이 씀) |
| `data/` | 챕터 · 퀘스트 내용, 가이드 카드 |
| `img/ui/` | UI 부품 그림 (패널 테두리 · 붉은 버튼 · 녹색 헤더 판) — CSS border-image로 늘려 씀 |
| `img/char/` | 캐릭터 (교수님 대화창 표정 4 · 전신 3, 학생 4종 정면·뒷모습, 고양이) |
| `img/bg/` | 배경 (월드맵, 챕터 맵, 퀘스트 장면, 낚시터, 챕터 완료). 데이터의 `bg` 칸으로 연결 |
| `img/glow/` | 배경 속 등불만 밝게 한 층. 배경 위에 겹쳐 밝았다 어두워졌다 함 (`js/app.js`의 `GLOWS`에 이름이 있을 때만). 새 배경은 `tools/glow-keep.txt`(찾은 등불 중 남길 위치) · `tools/glow-spots.txt`(작아서 못 찾은 등불, 지도용)에 위치(그림 %)를 적고, 장 지도는 `tools/glow-groups.txt`에 건물별로 묶어 `LAYERS=5`로 층을 나눠요 (같은 건물은 함께, 건물끼리는 시간차). `python3 -I tools/glow.py img/bg/이름.jpg img/glow/이름.png` (`KEEP="x,y;x,y"`) |
