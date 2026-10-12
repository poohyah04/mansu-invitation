// 개역한글판 성경 데이터와 구절 참조 파서.
// 데이터: public/bible/krv.json — [책][장][절] 순서의 문자열 3중 배열.

export type BibleData = string[][][];

export type Book = {
  name: string;
  abbr: string;
  aliases: string[];
  testament: "old" | "new";
};

const RAW_BOOKS: [string, string, string[]][] = [
  ["창세기", "창", []],
  ["출애굽기", "출", []],
  ["레위기", "레", []],
  ["민수기", "민", []],
  ["신명기", "신", []],
  ["여호수아", "수", ["여호수아서"]],
  ["사사기", "삿", []],
  ["룻기", "룻", []],
  ["사무엘상", "삼상", []],
  ["사무엘하", "삼하", []],
  ["열왕기상", "왕상", []],
  ["열왕기하", "왕하", []],
  ["역대상", "대상", ["역대기상"]],
  ["역대하", "대하", ["역대기하"]],
  ["에스라", "스", []],
  ["느헤미야", "느", []],
  ["에스더", "에", []],
  ["욥기", "욥", []],
  ["시편", "시", []],
  ["잠언", "잠", []],
  ["전도서", "전", []],
  ["아가", "아", ["아가서"]],
  ["이사야", "사", ["이사야서"]],
  ["예레미야", "렘", ["예레미야서"]],
  ["예레미야애가", "애", ["애가"]],
  ["에스겔", "겔", ["에스겔서"]],
  ["다니엘", "단", ["다니엘서"]],
  ["호세아", "호", ["호세아서"]],
  ["요엘", "욜", ["요엘서"]],
  ["아모스", "암", ["아모스서"]],
  ["오바댜", "옵", ["오바댜서"]],
  ["요나", "욘", ["요나서"]],
  ["미가", "미", ["미가서"]],
  ["나훔", "나", ["나훔서"]],
  ["하박국", "합", ["하박국서"]],
  ["스바냐", "습", ["스바냐서"]],
  ["학개", "학", ["학개서"]],
  ["스가랴", "슥", ["스가랴서"]],
  ["말라기", "말", ["말라기서"]],
  ["마태복음", "마", []],
  ["마가복음", "막", []],
  ["누가복음", "눅", []],
  ["요한복음", "요", []],
  ["사도행전", "행", []],
  ["로마서", "롬", []],
  ["고린도전서", "고전", ["고린도1서"]],
  ["고린도후서", "고후", ["고린도2서"]],
  ["갈라디아서", "갈", []],
  ["에베소서", "엡", []],
  ["빌립보서", "빌", []],
  ["골로새서", "골", []],
  ["데살로니가전서", "살전", ["데살로니가1서"]],
  ["데살로니가후서", "살후", ["데살로니가2서"]],
  ["디모데전서", "딤전", ["디모데1서"]],
  ["디모데후서", "딤후", ["디모데2서"]],
  ["디도서", "딛", []],
  ["빌레몬서", "몬", []],
  ["히브리서", "히", []],
  ["야고보서", "약", []],
  ["베드로전서", "벧전", ["베드로1서"]],
  ["베드로후서", "벧후", ["베드로2서"]],
  ["요한일서", "요일", ["요한1서"]],
  ["요한이서", "요이", ["요한2서"]],
  ["요한삼서", "요삼", ["요한3서"]],
  ["유다서", "유", []],
  ["요한계시록", "계", ["계시록"]],
];

export const BOOKS: Book[] = RAW_BOOKS.map(([name, abbr, aliases], i) => ({
  name,
  abbr,
  aliases,
  testament: i < 39 ? "old" : "new",
}));

const SHORT_NAMES: Record<string, string[]> = { 마태복음: ["마태"], 마가복음: ["마가"], 누가복음: ["누가"] };

// 별칭 → 책 번호. full: 약어가 아닌 이름인지 (숫자 없이 책 이름만 입력했을 때 구분용)
const ALIASES: { key: string; book: number; full: boolean }[] = BOOKS.flatMap(
  (b, i) => [
    { key: b.name, book: i, full: true },
    { key: b.abbr, book: i, full: false },
    ...b.aliases.map((a) => ({ key: a, book: i, full: true })),
    // "누가"처럼 일상 단어와 겹치는 이름은 장 번호가 뒤따를 때만 책으로 본다
    ...(SHORT_NAMES[b.name] ?? []).map((a) => ({ key: a, book: i, full: false })),
  ],
).sort((a, b) => b.key.length - a.key.length);

export type Reference = {
  book: number;
  chapter: number; // 1-based
  from?: number; // 1-based, 없으면 장 전체
  to?: number;
};

const REF_TAIL = /^(\d+)(?:장|편|[:.])?(?:(\d+)절?)?(?:[-~](?:(\d+)[:.])?(\d+)절?)?$/;

const KO_NUM =
  /^(?:([일이삼사오육륙칠팔구]?)백)?(?:([이삼사오육륙칠팔구]?)십)?([일이삼사오육륙칠팔구])?$/;
const KO_DIGIT: Record<string, number> = {
  일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9,
};

function koNumber(s: string): number | null {
  const m = s.match(KO_NUM);
  if (!m || !s) return null;
  const d = (c: string | undefined, dflt: number) => (c ? KO_DIGIT[c] : dflt);
  const hundreds = s.includes("백") ? d(m[1], 1) : 0;
  const tens = s.includes("십") ? d(m[2], 1) : 0;
  return hundreds * 100 + tens * 10 + d(m[3], 0);
}

/**
 * 말로 한 참조를 숫자 표기로 바꾼다 (공백 제거된 문자열 기준).
 * "마태복음오장오절" → "마태복음5장5절", "시편이십삼편" → "시편23편",
 * "3절부터10절까지" → "3-10절"
 */
export function normalizeSpokenNumbers(s: string): string {
  s = s.replace(/[일이삼사오육륙칠팔구십백]+(?=장|편|절|에서|부터|까지|$)/g, (run) => {
    // "요일사장"처럼 책 약어 끝 글자가 숫자 글자와 붙은 경우를 위해 가장 긴 유효한 뒷부분만 숫자로 바꾼다
    for (let i = 0; i < run.length; i++) {
      const n = koNumber(run.slice(i));
      if (n) return run.slice(0, i) + n;
    }
    return run;
  });
  return s
    .replace(/(\d+)절?(?:에서|부터)(\d+)/g, "$1-$2")
    .replace(/(\d+)장(?:에서|부터)(\d+)장/g, "$1장")
    .replace(/까지$/, "")
    .replace(/[.。!?]+$/, "");
}

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 음성 인식이 잘못 들은 책 이름("마테복음", "요한 복음")을 가장 가까운 책으로 */
function fuzzyBook(head: string, strict: boolean): number | null {
  if (head.length < 3) return null;
  let best: { book: number; d: number } | null = null;
  for (const a of ALIASES) {
    if (!a.full || a.key.length < 3) continue;
    const d = editDistance(head, a.key);
    if (!best || d < best.d) best = { book: a.book, d };
  }
  const limit = strict ? 1 : head.length >= 5 ? 2 : 1;
  return best && best.d <= limit ? best.book : null;
}

function parseTail(book: number, rest: string): Reference | null {
  const m = rest.match(REF_TAIL);
  if (!m) return null;
  const chapter = Number(m[1]);
  const ref: Reference = { book, chapter };
  if (m[2]) {
    ref.from = Number(m[2]);
    // "5:3-6:2" 같은 장 넘김은 지원하지 않고 시작 장 끝까지 보여준다
    if (m[4]) ref.to = m[3] && Number(m[3]) !== chapter ? Infinity : Number(m[4]);
  } else if (m[4]) {
    // "요한복음 5-6" 처럼 숫자만 범위인 경우는 절 범위로 해석하지 않는다
    return null;
  }
  return ref;
}

/** "마태복음 5장 5절", "요 3:16-18", "요한복음 5장", "시편 23편", "마태복음 오장 오절" 등을 해석. 해석 못 하면 null. */
export function parseReference(input: string): Reference | null {
  const s = normalizeSpokenNumbers(input.replace(/\s+/g, ""));
  if (!s) return null;
  for (const a of ALIASES) {
    if (!s.startsWith(a.key)) continue;
    const rest = s.slice(a.key.length);
    if (rest === "") {
      // 약어 한 글자는 검색어일 수 있으므로 전체 이름일 때만 1장으로 이동
      if (a.full) return { book: a.book, chapter: 1 };
      continue;
    }
    const ref = parseTail(a.book, rest);
    if (ref) return ref;
  }
  const m = s.match(/^(\D+?)(\d.*)?$/);
  if (m) {
    const book = fuzzyBook(m[1], !m[2]);
    if (book !== null) return m[2] ? parseTail(book, m[2]) : m[1].length >= 4 ? { book, chapter: 1 } : null;
  }
  return null;
}

/**
 * 쉼표·줄바꿈으로 나눈 여러 참조. "요 3:16, 롬 8:28, 시 23편", "요 3:16, 18", "시 23편, 24편".
 * 하나라도 해석 못 하면 null (단어 검색으로 넘긴다).
 */
export function parseReferences(input: string): Reference[] | null {
  const parts = input.split(/[,;\n、]|그리고/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const refs: Reference[] = [];
  for (const part of parts) {
    let ref = parseReference(part);
    const prev = refs[refs.length - 1];
    if (!ref && prev) {
      const p = normalizeSpokenNumbers(part.replace(/\s+/g, ""));
      const verseOnly = p.match(/^(\d+)절?(?:[-~](\d+)절?)?$/);
      if (verseOnly && prev.from) {
        ref = { book: prev.book, chapter: prev.chapter, from: Number(verseOnly[1]) };
        if (verseOnly[2]) ref.to = Number(verseOnly[2]);
      } else {
        ref = parseTail(prev.book, p);
      }
    }
    if (!ref) return null;
    refs.push(ref);
  }
  return refs;
}

/** 음성 명령에서 "찾아줘", "들어간 구절" 같은 말을 걷어낸다 */
export function cleanSpokenQuery(text: string): string {
  return text
    .trim()
    .replace(/[.。!?]+$/, "")
    .replace(/\s*(?:을|를)?\s*(?:찾아\s*(?:줘|주세요|봐)|보여\s*(?:줘|주세요)|검색\s*(?:해\s*(?:줘|주세요))?|열어\s*(?:줘|주세요))$/, "")
    .replace(/\s*(?:이|가|을|를)?\s*(?:들어간|나오는|있는)\s*(?:구절|말씀|본문)(?:들)?$/, "")
    .replace(/\s*(?:구절|말씀|본문)$/, "")
    .trim();
}

export type Verse = { book: number; chapter: number; verse: number; text: string };

export function versesFor(data: BibleData, ref: Reference): Verse[] {
  const ch = data[ref.book]?.[ref.chapter - 1];
  if (!ch) return [];
  const from = ref.from ?? 1;
  const to = Math.min(ref.to ?? (ref.from ? ref.from : ch.length), ch.length);
  const out: Verse[] = [];
  for (let v = from; v <= to; v++) {
    out.push({ book: ref.book, chapter: ref.chapter, verse: v, text: ch[v - 1] });
  }
  return out;
}

export type Scope = "all" | "old" | "new" | number;

/** 공백으로 나눈 모든 단어를 포함하는 구절 검색 */
export function searchVerses(data: BibleData, query: string, scope: Scope): Verse[] {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out: Verse[] = [];
  data.forEach((chapters, b) => {
    if (typeof scope === "number" ? b !== scope : scope !== "all" && BOOKS[b].testament !== scope) return;
    chapters.forEach((verses, c) =>
      verses.forEach((text, v) => {
        if (terms.every((t) => text.includes(t))) {
          out.push({ book: b, chapter: c + 1, verse: v + 1, text });
        }
      }),
    );
  });
  return out;
}

export function refLabel(v: Pick<Verse, "book" | "chapter" | "verse">, short = false) {
  const b = BOOKS[v.book];
  return `${short ? b.abbr : b.name} ${v.chapter}:${v.verse}`;
}

export type CopyFormat = "basic" | "bulletin" | "slides";

export const COPY_FORMATS: { id: CopyFormat; label: string; hint: string }[] = [
  { id: "basic", label: "기본", hint: "장절 제목 + 절마다 줄바꿈" },
  { id: "bulletin", label: "주보용", hint: "본문을 한 문단으로, 끝에 장절" },
  { id: "slides", label: "자막·PPT용", hint: "한 절씩 따로, 절마다 장절" },
];

function groupVerses(verses: Verse[]): Verse[][] {
  const sorted = [...verses].sort(
    (a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse,
  );
  const groups: Verse[][] = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    const last = g?.[g.length - 1];
    if (last && last.book === v.book && last.chapter === v.chapter && last.verse + 1 === v.verse) {
      g.push(v);
    } else {
      groups.push([v]);
    }
  }
  return groups;
}

export function rangeLabel(g: Verse[], short = false) {
  const b = BOOKS[g[0].book];
  const last = g[g.length - 1].verse;
  return `${short ? b.abbr : b.name} ${g[0].chapter}:${g[0].verse}${last !== g[0].verse ? `-${last}` : ""}`;
}

/**
 * 붙여넣기용 텍스트. 같은 장의 연속된 절은 한 묶음으로 다룬다.
 * - 기본: 단일 절은 "본문 (마태복음 5:5)", 여러 절은 "마태복음 5:3-5" 아래 "3 본문" 줄
 * - 주보용: "본문 본문 … (마태복음 5:3-5)"
 * - 자막·PPT용: 절마다 "본문\n(마태복음 5:3)", 빈 줄로 구분
 */
export function formatVerses(verses: Verse[], format: CopyFormat = "basic"): string {
  if (format === "slides") {
    return [...verses]
      .sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse)
      .map((v) => `${v.text}\n(${refLabel(v)})`)
      .join("\n\n");
  }
  return groupVerses(verses)
    .map((g) => {
      if (format === "bulletin") return `${g.map((v) => v.text).join(" ")} (${rangeLabel(g)})`;
      if (g.length === 1) return `${g[0].text} (${refLabel(g[0])})`;
      return [rangeLabel(g), ...g.map((v) => `${v.verse} ${v.text}`)].join("\n");
    })
    .join("\n\n");
}
