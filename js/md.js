'use strict';
// 가이드 카드(data/cards/*.md)와 퀘스트 설명을 그리는 아주 작은 마크다운 변환기
// 지원: ## ### 제목, 문단, **굵게** *기울임* `코드` [링크](주소), - 목록, 1. 목록, - [ ] 체크, | 표 |, > 인용, ---
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function mdInline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}"${u.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}>${t}</a>`);
}

function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { const n = Math.min(m[1].length + 1, 5); out.push(`<h${n}>${mdInline(m[2])}</h${n}>`); i++; continue; }
    if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (l.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${buf.map(mdInline).join('<br>')}</blockquote>`);
      continue;
    }
    if (l.trim().startsWith('|') && /^\s*\|?\s*:?-+/.test(lines[i + 1] || '')) {
      const head = cells(l);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      out.push(`<table><thead><tr>${head.map(c => `<th>${mdInline(c)}</th>`).join('')}</tr></thead><tbody>${
        rows.map(r => `<tr>${r.map(c => `<td>${mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l), items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let t = lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, '');
        const box = t.match(/^\[( |x)\]\s+/i);
        if (box) t = `<span class="box${box[1].trim() ? ' on' : ''}"></span>${mdInline(t.slice(box[0].length))}`;
        else t = mdInline(t);
        items.push(`<li${box ? ' class="check"' : ''}>${t}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|---+\s*$|\s*([-*]|\d+\.)\s+|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) buf.push(lines[i++]);
    out.push(`<p>${buf.map(mdInline).join('<br>')}</p>`);
  }
  return out.join('');
}

// 카드 md 파일 → [{ title, md }] ('## 1. 제목' 단위로 나눔, 맨 위 '# 제목'과 설명은 버림)
function mdCards(src) {
  return String(src || '').replace(/\r/g, '').split(/^## /m).slice(1).map(part => {
    const nl = part.indexOf('\n');
    const title = (nl < 0 ? part : part.slice(0, nl)).trim().replace(/^\d+\.\s*/, '');
    const body = (nl < 0 ? '' : part.slice(nl + 1)).replace(/\n---\s*$/, '').trim();
    return { title, md: body };
  });
}
