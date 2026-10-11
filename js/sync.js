// 구글 로그인 + 기기 간 동기화 + 교수님 진행도 보기 (Firebase Auth + Firestore)
// Lab Manager와 같은 Firebase 프로젝트를 써요 → Lab Manager 랩 문서의 멤버(학생 이메일) 목록으로 교수님이 학생 진행도를 읽음
// firebase-config.js 가 null 이면 아무것도 하지 않음 → 이 브라우저에만 저장
// 저장 위치 (학생 구글 이메일을 소문자로 문서 이름에 씀 — 교수님이 멤버 이메일로 바로 찾을 수 있게)
//   quest/{email}              { email, name, updatedAt } 요약 — 교수님 목록에 보임
//   quest/{email}/rec/{키}      { j: JSON 글 } 기록 하나 = 문서 하나
//     p:퀘스트id 진행도 · r:id 발표 기록 · c:id My CV · d:챕터id 챕터 완료 · s:id 투고 낚시터 원고 · f Figure 순서 카드 · n 이름 · a 내 캐릭터
//   labs/{PI uid}              Lab Manager가 만든 랩 문서 { owner, members: [학생 이메일] } — 여기서는 읽기만
// app.js 의 db, fresh, persistLocal, render, toast 를 그대로 씀
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';

if (firebaseConfig) start();

// ---------- 기록 단위: 키 → JSON 글 ----------
function units(d) {
  const out = new Map();
  for (const [id, p] of Object.entries(d.progress || {})) out.set(`p:${id}`, JSON.stringify(p));
  for (const r of d.records || []) out.set(`r:${r.id}`, JSON.stringify(r));
  for (const c of d.cv || []) out.set(`c:${c.id}`, JSON.stringify(c));
  for (const [id, x] of Object.entries(d.chapterDone || {})) out.set(`d:${id}`, JSON.stringify(x));
  for (const x of d.subs || []) out.set(`s:${x.id}`, JSON.stringify(x));
  if (d.figcards?.length) out.set('f', JSON.stringify(d.figcards));
  if (d.name) out.set('n', JSON.stringify(d.name));
  if (d.avatar) out.set('a', JSON.stringify(d.avatar));
  return out;
}
function apply(d, key, j) { // j == null 이면 지움
  const id = key.slice(2), v = j == null ? null : JSON.parse(j);
  const upsert = (list, rec) => { const i = list.findIndex(x => x.id === rec.id); if (i < 0) list.push(rec); else list[i] = rec; };
  switch (key[0]) {
    case 'p': if (v) d.progress[id] = v; else delete d.progress[id]; break;
    case 'r': if (v) upsert(d.records, v); else d.records = d.records.filter(x => x.id !== id); break;
    case 'c': if (v) upsert(d.cv, v); else d.cv = d.cv.filter(x => x.id !== id); break;
    case 'd': if (v) d.chapterDone[id] = v; else delete d.chapterDone[id]; break;
    case 's': if (v) upsert(d.subs, v); else d.subs = d.subs.filter(x => x.id !== id); break;
    case 'f': d.figcards = v || []; break;
    case 'n': d.name = v || ''; break;
    case 'a': d.avatar = v || 'intern-f'; break;
  }
}

async function start() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`),
  ]);
  await dbReady; // 이 기기 기록을 다 읽은 뒤에 서버 기록과 합치기
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  // 같은 주소의 다른 앱(Lab Manager 등)과 기기 캐시를 같이 쓰므로 여러 탭 방식
  const fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });

  let user = null, email = '', unsub = null, synced = new Map(), ready = false, timer = null, members = [];

  const login = () => A.signInWithPopup(auth, new A.GoogleAuthProvider()).catch(e => {
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') alert(`로그인하지 못했어요: ${e.code}`);
  });
  const logout = () => { flush(); A.signOut(auth); };

  // 교수님: 멤버 학생마다 기록을 읽어 옴 (규칙이 교수님 랩 멤버인 학생만 허용)
  async function loadStudents() {
    return Promise.all(members.map(async m => {
      const [sum, recs] = await Promise.all([F.getDoc(F.doc(fs, 'quest', m)), F.getDocs(F.collection(fs, 'quest', m, 'rec'))]);
      const d = fresh();
      recs.forEach(doc => apply(d, doc.id, doc.data().j));
      return { email: m, name: sum.data()?.name || d.name, updatedAt: sum.data()?.updatedAt || 0, db: d };
    }));
  }
  window.cloud = { user: null, isPI: false, login, logout, loadStudents };

  const btn = $('accountBtn');
  btn.hidden = false;
  btn.onclick = () => (user ? $('menuBtn').click() : login());
  function showAccount() {
    btn.textContent = user ? (db.name || user.displayName || user.email || '?').slice(0, 1) : '로그인';
    btn.className = user ? 'avatar' : 'btn';
    btn.title = user ? `${user.email} · 자동 동기화${window.cloud.isPI ? ' · 교수님' : ''}` : 'Google 계정으로 로그인';
  }

  const recRef = key => F.doc(fs, 'quest', email, 'rec', key);

  // ---------- 올리기: 마지막으로 맞춘 뒤 바뀐 것만 ----------
  function flush() {
    clearTimeout(timer);
    if (!user || !ready) return;
    const now = units(db), ops = [];
    for (const [k, j] of now) if (synced.get(k) !== j) { ops.push([k, j]); synced.set(k, j); }
    for (const k of [...synced.keys()]) if (!now.has(k)) { ops.push([k, null]); synced.delete(k); }
    if (!ops.length) return;
    for (let i = 0; i < ops.length; i += 400) {
      const batch = F.writeBatch(fs);
      for (const [k, j] of ops.slice(i, i + 400)) { if (j == null) batch.delete(recRef(k)); else batch.set(recRef(k), { j }); }
      if (i === 0) batch.set(F.doc(fs, 'quest', email), { email, name: db.name || user.displayName || '', updatedAt: Date.now() }, { merge: true });
      batch.commit().catch(e => { console.error('동기화 실패', e); toast(`저장하지 못했어요 (${e.code}). 인터넷 연결을 확인해 주세요.`, 4000); });
    }
  }
  window.onSave = () => { clearTimeout(timer); timer = setTimeout(flush, 400); };
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  // ---------- 로그인 / 로그아웃 ----------
  A.onAuthStateChanged(auth, async u => {
    unsub?.(); unsub = null;
    synced = new Map(); ready = false; members = [];
    user = u;
    email = (u?.email || '').toLowerCase();
    Object.assign(window.cloud, { user: u, isPI: false });
    if (!u) {
      // 로그아웃: 이 기기에 남은 계정 기록은 지움 (계정에는 그대로 있음) — 연구실 공용 PC에서 다음 사람과 섞이지 않게
      if (db.owner) { db = fresh(); persistLocal(); }
      showAccount(); render();
      return;
    }
    if (db.owner && db.owner !== email) { db = fresh(); persistLocal(); } // 다른 사람이 쓰던 기기
    showAccount();

    // 교수님인지: Lab Manager 랩 문서(labs/{내 uid})가 있으면
    F.getDoc(F.doc(fs, 'labs', u.uid)).then(s => {
      if (s.exists() && s.data().owner === u.uid) {
        members = [...new Set((s.data().members || []).map(e => e.toLowerCase()))].sort();
        window.cloud.isPI = true;
        showAccount(); render();
      }
    }).catch(e => console.warn('랩 문서 확인 실패', e.code));

    let first = true;
    unsub = F.onSnapshot(F.collection(fs, 'quest', email, 'rec'), { includeMetadataChanges: true }, snap => {
      if (first) {
        if (snap.metadata.fromCache) return; // 서버 값을 받은 뒤에 합침
        first = false;
        // 처음: 서버 기록 + 로그인 전에 이 기기에서 한 기록(서버에 없는 것)을 합침
        snap.forEach(d => { apply(db, d.id, d.data().j); synced.set(d.id, d.data().j); });
        db.owner = email;
        ready = true;
        persistLocal(); showAccount(); render();
        flush();
        if (!snap.empty) toast('진행도를 불러왔어요');
        return;
      }
      let changed = false;
      for (const ch of snap.docChanges()) {
        if (ch.doc.metadata.hasPendingWrites) continue; // 내가 방금 올린 것
        const j = ch.type === 'removed' ? null : ch.doc.data().j;
        if (synced.get(ch.doc.id) === j) continue;
        apply(db, ch.doc.id, j);
        if (j == null) synced.delete(ch.doc.id); else synced.set(ch.doc.id, j);
        changed = true;
      }
      if (changed) { persistLocal(); render(); }
    }, e => { console.error('동기화 실패', e); toast(`진행도를 불러오지 못했어요 (${e.code})`, 4000); });
  });
}
