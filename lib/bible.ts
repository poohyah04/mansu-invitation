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
  ["마태복음", "마", ["마태"]],
  ["마가복음", "막", ["마가"]],
  ["누가복음", "눅", ["누가"]],
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

// 별칭 → 책 번호. full: 약어가 아닌 이름인지 (숫자 없이 책 이름만 입력했을 때 구분용)
const ALIASES: { key: string; book: number; full: boolean }[] = BOOKS.flatMap(
  (b, i) => [
    { key: b.name, book: i, full: true },
    { key: b.abbr, book: i, full: false },
    ...b.aliases.map((a) => ({ key: a, book: i, full: true })),
  ],
).sort((a, b) => b.key.length - a.key.length);

export type Reference = {
  book: number;
  chapter: number; // 1-based
  from?: number; // 1-based, 없으면 장 전체
  to?: number;
};

const REF_TAIL =
  /^(\d+)(?:장|편|[:.,])?(?:(\d+)절?)?(?:[-~](?:(\d+)[:.])?(\d+)절?)?$/;

/** "마태복음 5장 5절", "요 3:16-18", "요한복음 5장", "시편 23편" 등을 해석. 해석 못 하면 null. */
export function parseReference(input: string): Reference | null {
  const s = input.replace(/\s+/g, "");
  if (!s) return null;
  for (const a of ALIASES) {
    if (!s.startsWith(a.key)) continue;
    const rest = s.slice(a.key.length);
    if (rest === "") {
      // 약어 한 글자는 검색어일 수 있으므로 전체 이름일 때만 1장으로 이동
      return a.full ? { book: a.book, chapter: 1 } : null;
    }
    const m = rest.match(REF_TAIL);
    if (!m) continue;
    const chapter = Number(m[1]);
    const from = m[2];
    // "5:3-6:2" 같은 장 넘김은 지원하지 않고 시작 장 끝까지 보여준다
    const toChapter = m[3] ? Number(m[3]) : undefined;
    const to = m[4];
    const ref: Reference = { book: a.book, chapter };
    if (from) {
      ref.from = Number(from);
      if (to) ref.to = toChapter && toChapter !== chapter ? Infinity : Number(to);
    } else if (to) {
      // "요한복음 5-6" 처럼 숫자만 범위인 경우는 절 범위로 해석하지 않는다
      return null;
    }
    return ref;
  }
  return null;
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

/**
 * 붙여넣기용 텍스트. 같은 장의 연속된 절은 묶어서
 *   마태복음 5:3-5
 *   3 심령이 ...
 * 단일 절은 "본문 (마태복음 5:5)" 형식.
 */
export function formatVerses(verses: Verse[]): string {
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
  return groups
    .map((g) => {
      if (g.length === 1) return `${g[0].text} (${refLabel(g[0])})`;
      const head = `${BOOKS[g[0].book].name} ${g[0].chapter}:${g[0].verse}-${g[g.length - 1].verse}`;
      return [head, ...g.map((v) => `${v.verse} ${v.text}`)].join("\n");
    })
    .join("\n\n");
}
