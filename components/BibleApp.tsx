"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  CloudOff,
  Download,
  Mic,
  MonitorPlay,
  NotebookPen,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Presenter from "@/components/bible/Presenter";
import { useOffline } from "@/components/bible/useOffline";
import { useSpeech } from "@/components/bible/useSpeech";
import {
  BOOKS,
  type BibleData,
  type CopyFormat,
  type Reference,
  type Scope,
  type Verse,
  COPY_FORMATS,
  cleanSpokenQuery,
  formatVerses,
  parseReferences,
  rangeLabel,
  refLabel,
  searchVerses,
  versesFor,
} from "@/lib/bible";

const MEMO_KEY = "bible-memo";
const FORMAT_KEY = "bible-copy-format";
const PAGE_SIZE = 100;
const EXAMPLES = ["마태복음 5장 5절", "요한복음 3장", "요 3:16, 롬 8:28, 시 23편", "고전 13:4-7", "사랑하는"];

type View =
  | { kind: "ref"; ref: Reference; verses: Verse[] }
  | { kind: "multi"; sections: { ref: Reference; verses: Verse[] }[]; verses: Verse[] }
  | { kind: "search"; query: string; verses: Verse[] }
  | { kind: "empty"; message: string };

const keyOf = (v: Verse) => `${v.book}:${v.chapter}:${v.verse}`;

let dataPromise: Promise<BibleData> | null = null;
function loadBible() {
  dataPromise ??= fetch("/bible/krv.json").then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
  return dataPromise;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 클립보드 API를 쓸 수 없는 환경(비보안 컨텍스트 등)용 대체 방법
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function computeView(data: BibleData, query: string, scope: Scope): View | null {
  if (!query) return null;
  const refs = parseReferences(query);
  if (refs && refs.length > 1) {
    const sections = refs.map((ref) => ({ ref, verses: versesFor(data, ref) })).filter((s) => s.verses.length);
    if (sections.length) return { kind: "multi", sections, verses: sections.flatMap((s) => s.verses) };
    return { kind: "empty", message: "입력한 본문을 찾을 수 없습니다. 장과 절 번호를 확인해 주세요." };
  }
  const ref = refs?.[0];
  if (ref) {
    const verses = versesFor(data, ref);
    if (verses.length) return { kind: "ref", ref, verses };
    const book = BOOKS[ref.book];
    const chapters = data[ref.book].length;
    return {
      kind: "empty",
      message:
        ref.chapter > chapters || ref.chapter < 1
          ? `${book.name}은(는) ${chapters}장까지 있습니다.`
          : `${book.name} ${ref.chapter}장은 ${data[ref.book][ref.chapter - 1].length}절까지 있습니다.`,
    };
  }
  const verses = searchVerses(data, query, scope);
  return verses.length
    ? { kind: "search", query, verses }
    : { kind: "empty", message: `“${query}”이(가) 들어간 구절이 없습니다.` };
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/40">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function BibleApp() {
  const [data, setData] = useState<BibleData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE_SIZE);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [format, setFormat] = useState<CopyFormat>("basic");
  const [present, setPresent] = useState<Verse[] | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const saveMemo = (next: string) => {
    setMemo(next);
    try {
      localStorage.setItem(MEMO_KEY, next);
    } catch {}
  };

  useEffect(() => {
    loadBible().then(
      (d) => {
        setData(d);
        try {
          setMemo(localStorage.getItem(MEMO_KEY) ?? "");
          const f = localStorage.getItem(FORMAT_KEY);
          if (COPY_FORMATS.some((c) => c.id === f)) setFormat(f as CopyFormat);
        } catch {}
        // 주소의 ?q= 로 바로 열기
        const q = new URL(window.location.href).searchParams.get("q")?.trim();
        if (q) {
          setInput(q);
          setView(computeView(d, q, "all"));
        }
      },
      () => setLoadError(true),
    );
  }, []);

  const run = useCallback(
    (q: string, sc: Scope = scope, focus?: string) => {
      if (!data) return;
      const query = q.trim();
      setSelected(new Set());
      setShown(PAGE_SIZE);
      setFocusKey(focus ?? null);
      const url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", url);
      setView(computeView(data, query, sc));
    },
    [data, scope],
  );

  const speech = useSpeech({
    onInterim: setInput,
    onFinal: (text) => {
      const q = cleanSpokenQuery(text);
      setInput(q);
      run(q);
      window.scrollTo({ top: 0 });
    },
    onError: notify,
  });
  const offline = useOffline();

  const chooseFormat = (f: CopyFormat) => {
    setFormat(f);
    try {
      localStorage.setItem(FORMAT_KEY, f);
    } catch {}
  };

  useEffect(() => {
    if (!focusKey) return;
    document.getElementById(`v-${focusKey}`)?.scrollIntoView({ block: "center" });
  }, [focusKey, view]);

  const goTo = (q: string, focus?: string) => {
    setInput(q);
    run(q, scope, focus);
    if (!focus) window.scrollTo({ top: 0 });
  };

  const verses = useMemo(() => view && view.kind !== "empty" ? view.verses : [], [view]);
  const visible = view?.kind === "search" ? verses.slice(0, shown) : verses;
  const terms = view?.kind === "search" ? view.query.trim().split(/\s+/) : [];
  const selectedVerses = verses.filter((v) => selected.has(keyOf(v)));
  const allSelected = verses.length > 0 && selectedVerses.length === verses.length;

  const toggle = (v: Verse) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const k = keyOf(v);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const copySelected = async () => {
    if (await copyText(formatVerses(selectedVerses, format))) notify(`${selectedVerses.length}절을 복사했습니다`);
    else notify("복사하지 못했습니다");
  };

  const addToMemo = () => {
    const text = formatVerses(selectedVerses, format);
    saveMemo(memo.trim() ? `${memo.replace(/\s+$/, "")}\n\n${text}\n` : `${text}\n`);
    notify(`${selectedVerses.length}절을 메모장에 넣었습니다`);
    setSelected(new Set());
  };

  const downloadMemo = () => {
    const blob = new Blob([memo], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `성경메모-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const closePresenter = useCallback(() => setPresent(null), []);

  const ref = view?.kind === "ref" ? view.ref : null;
  const isWholeChapter = ref && !ref.from;
  const chapterCount = ref && data ? data[ref.book].length : 0;

  let title = "";
  if (ref) {
    const book = BOOKS[ref.book];
    const unit = ref.book === 18 ? "편" : "장";
    title = isWholeChapter
      ? `${book.name} ${ref.chapter}${unit}`
      : `${book.name} ${ref.chapter}:${verses[0].verse}${verses.length > 1 ? `-${verses[verses.length - 1].verse}` : ""}`;
  }

  const renderRow = (v: Verse) => {
    const k = keyOf(v);
    const on = selected.has(k);
    return (
      <li key={k} id={`v-${k}`}>
        <div
          role="checkbox"
          aria-checked={on}
          tabIndex={0}
          onClick={() => toggle(v)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              toggle(v);
            }
          }}
          className={`group flex cursor-pointer gap-3 rounded-lg px-3 py-2 transition-colors ${
            on
              ? "bg-amber-100 ring-1 ring-amber-400 dark:bg-amber-900/30 dark:ring-amber-700"
              : focusKey === k
                ? "bg-amber-50 dark:bg-stone-900"
                : "hover:bg-stone-100 dark:hover:bg-stone-900"
          }`}
        >
          <span
            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              on ? "border-amber-700 bg-amber-700 text-white" : "border-stone-300 dark:border-stone-600"
            }`}
          >
            {on && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          <div className="flex-1 font-serif text-[17px] leading-relaxed">
            {view?.kind === "search" ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(`${BOOKS[v.book].name} ${v.chapter}장`, k);
                  }}
                  title="앞뒤 문맥 보기"
                  className="mr-2 font-sans text-sm font-medium text-amber-800 hover:underline dark:text-amber-400"
                >
                  {refLabel(v, true)}
                </button>
                <Highlight text={v.text} terms={terms} />
              </>
            ) : (
              <>
                <sup className="mr-1.5 font-sans text-xs font-semibold text-amber-800 dark:text-amber-500">{v.verse}</sup>
                {v.text}
              </>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 dark:bg-stone-950 dark:text-stone-200">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => goTo("")}
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <BookOpen className="h-5 w-5 text-amber-700 dark:text-amber-500" />
              성경 찾기
              <span className="text-xs font-normal text-stone-500">개역한글</span>
            </button>
            <div className="flex items-center gap-2">
            {!offline.online ? (
              <span className="flex items-center gap-1 text-xs text-stone-500" title="인터넷 연결 없음">
                <CloudOff className="h-3.5 w-3.5" /> 오프라인
              </span>
            ) : offline.canInstall && !offline.standalone ? (
              <button
                onClick={offline.install}
                className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-stone-800"
              >
                <Download className="h-3.5 w-3.5" /> 앱으로 설치
              </button>
            ) : offline.ready ? (
              <span className="hidden text-xs text-stone-500 sm:inline">인터넷 없이도 사용 가능</span>
            ) : null}
            <button
              onClick={() => setMemoOpen(true)}
              className="relative flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-900"
            >
              <NotebookPen className="h-4 w-4" />
              메모장
              {memo.trim() && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-600" />}
            </button>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              inputRef.current?.blur();
              run(input);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={speech.listening ? "듣고 있어요… 예: 요한복음 삼장 십육절" : "마태복음 5장 5절 · 요한복음 5장 · 사랑하는"}
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-9 text-base outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 dark:border-stone-700 dark:bg-stone-900"
                enterKeyHint="search"
                autoFocus
              />
              {input && (
                <button
                  type="button"
                  aria-label="지우기"
                  onClick={() => {
                    setInput("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {speech.supported && (
              <button
                type="button"
                aria-label={speech.listening ? "듣기 멈추기" : "말로 찾기"}
                aria-pressed={speech.listening}
                disabled={!data}
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
                className={`flex w-11 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${
                  speech.listening
                    ? "animate-pulse border-red-500 bg-red-500 text-white"
                    : "border-stone-300 bg-white text-amber-800 hover:border-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-amber-400"
                }`}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={!data}
              className="rounded-xl bg-amber-700 px-4 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              찾기
            </button>
          </form>
          <label className="flex items-center gap-2 text-xs text-stone-500">
            단어 검색 범위
            <select
              value={String(scope)}
              onChange={(e) => {
                const v = e.target.value;
                const sc: Scope = v === "all" || v === "old" || v === "new" ? v : Number(v);
                setScope(sc);
                if (view?.kind === "search" || view?.kind === "empty") run(input, sc);
              }}
              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              <option value="all">성경 전체</option>
              <option value="old">구약</option>
              <option value="new">신약</option>
              <optgroup label="구약">
                {BOOKS.slice(0, 39).map((b, i) => (
                  <option key={i} value={i}>{b.name}</option>
                ))}
              </optgroup>
              <optgroup label="신약">
                {BOOKS.slice(39).map((b, i) => (
                  <option key={i + 39} value={i + 39}>{b.name}</option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-4">
        {loadError && <p className="py-10 text-center text-red-600">성경 데이터를 불러오지 못했습니다. 새로고침해 주세요.</p>}
        {!data && !loadError && <p className="py-10 text-center text-stone-500">성경 데이터를 불러오는 중…</p>}

        {data && !view && (
          <div className="py-8 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            <p className="mb-4">본문 위치나 찾고 싶은 단어를 입력하세요.</p>
            <ul className="mb-6 list-disc space-y-1 pl-5">
              <li><b>마태복음 5장 5절</b>, <b>마 5:5</b> — 한 구절</li>
              <li><b>요한복음 5장</b>, <b>시편 23편</b> — 장 전체</li>
              <li><b>고전 13:4-7</b> — 여러 구절</li>
              <li><b>요 3:16, 롬 8:28, 시 23편</b> — 여러 본문 한꺼번에 (쉼표로 구분)</li>
              <li><b>사랑하는</b> — 그 단어가 들어간 모든 구절 (여러 단어는 띄어 쓰면 모두 포함된 구절)</li>
            </ul>
            {speech.supported && (
              <p className="mb-4">
                <Mic className="mr-1 inline h-4 w-4 align-[-3px] text-amber-700" />
                마이크를 누르고 <b>“요한복음 삼장 십육절”</b>, <b>“사랑이 들어간 구절 찾아줘”</b>처럼 말해도 됩니다.
              </p>
            )}
            <p className="mb-4">
              구절을 눌러 선택한 뒤 <b>복사</b>하거나 <b>메모장</b>에 모아둘 수 있습니다. 복사 형식은 기본·주보용·자막용 중에 고를 수 있고,{" "}
              <b>크게 보기</b>를 누르면 한 절씩 화면 가득 띄워 모임에서 함께 볼 수 있습니다.
            </p>
            {!offline.standalone && (
              <p className="mb-4 text-xs">
                휴대폰 홈 화면에 추가하면 앱처럼 열리고, 한 번 열어 두면 인터넷이 없어도 쓸 수 있습니다.
                <br />
                아이폰: Safari 공유 버튼 → 홈 화면에 추가 · 안드로이드: Chrome 메뉴 → 홈 화면에 추가(앱 설치)
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  onClick={() => goTo(q)}
                  className="rounded-full border border-stone-300 bg-white px-3 py-1 text-stone-700 hover:border-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {view?.kind === "empty" && <p className="py-10 text-center text-stone-500">{view.message}</p>}

        {view && view.kind !== "empty" && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-semibold">
                {view.kind === "ref" ? title : view.kind === "multi" ? (
                  <>본문 {view.sections.length}곳 <span className="text-base font-normal text-stone-500">{verses.length.toLocaleString()}절</span></>
                ) : (
                  <>“{view.query}” <span className="text-base font-normal text-stone-500">{verses.length.toLocaleString()}절</span></>
                )}
              </h1>
              <div className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => setPresent(selectedVerses.length ? selectedVerses : verses)}
                  title="한 절씩 화면 가득 크게 보기"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-stone-200 dark:hover:bg-stone-800"
                >
                  <MonitorPlay className="h-4 w-4" /> 크게 보기
                </button>
                {ref && !isWholeChapter && (
                  <button
                    onClick={() => goTo(`${BOOKS[ref.book].name} ${ref.chapter}장`, `${ref.book}:${ref.chapter}:${ref.from}`)}
                    className="rounded-lg px-2 py-1 text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-stone-800"
                  >
                    장 전체 보기
                  </button>
                )}
                <button
                  onClick={() => setSelected(allSelected ? new Set() : new Set(verses.map(keyOf)))}
                  className="rounded-lg px-2 py-1 hover:bg-stone-200 dark:hover:bg-stone-800"
                >
                  {allSelected ? "선택 해제" : "전체 선택"}
                </button>
              </div>
            </div>

            {view.kind === "multi" ? (
              <div className="space-y-6">
                {view.sections.map((sec, si) => (
                  <section key={si}>
                    <h2 className="mb-1 flex items-baseline justify-between gap-2 border-b border-stone-200 pb-1 font-semibold dark:border-stone-800">
                      {rangeLabel(sec.verses)}
                      {sec.ref.from && (
                        <button
                          onClick={() => goTo(`${BOOKS[sec.ref.book].name} ${sec.ref.chapter}장`, keyOf(sec.verses[0]))}
                          className="text-xs font-normal text-amber-800 hover:underline dark:text-amber-400"
                        >
                          장 전체
                        </button>
                      )}
                    </h2>
                    <ol className="space-y-1">{sec.verses.map(renderRow)}</ol>
                  </section>
                ))}
              </div>
            ) : (
              <ol className="space-y-1">{visible.map(renderRow)}</ol>
            )}

            {view.kind === "search" && shown < verses.length && (
              <button
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="mt-4 w-full rounded-xl border border-stone-300 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-900"
              >
                더 보기 ({shown.toLocaleString()} / {verses.length.toLocaleString()})
              </button>
            )}

            {ref && (
              <nav className="mt-6 flex justify-between text-sm">
                {ref.chapter > 1 ? (
                  <button onClick={() => goTo(`${BOOKS[ref.book].name} ${ref.chapter - 1}장`)} className="flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-stone-200 dark:hover:bg-stone-800">
                    <ChevronLeft className="h-4 w-4" /> {ref.chapter - 1}장
                  </button>
                ) : <span />}
                {ref.chapter < chapterCount && (
                  <button onClick={() => goTo(`${BOOKS[ref.book].name} ${ref.chapter + 1}장`)} className="flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-stone-200 dark:hover:bg-stone-800">
                    {ref.chapter + 1}장 <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </nav>
            )}
          </>
        )}
      </main>

      {selectedVerses.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
          <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-4 pt-2.5 text-xs text-stone-500">
            복사 형식
            {COPY_FORMATS.map((f) => (
              <button
                key={f.id}
                title={f.hint}
                aria-pressed={format === f.id}
                onClick={() => chooseFormat(f.id)}
                className={`rounded-full border px-2.5 py-1 ${
                  format === f.id
                    ? "border-amber-700 bg-amber-700 text-white"
                    : "border-stone-300 text-stone-600 hover:border-amber-600 dark:border-stone-700 dark:text-stone-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <span className="mr-auto text-sm"><b>{selectedVerses.length}</b>절 선택</span>
            <button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
              취소
            </button>
            <button onClick={addToMemo} className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">
              <NotebookPen className="h-4 w-4" /> 메모장에
            </button>
            <button onClick={copySelected} className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800">
              <ClipboardCopy className="h-4 w-4" /> 복사
            </button>
          </div>
        </div>
      )}

      {memoOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setMemoOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-stone-900"
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <h2 className="flex items-center gap-2 font-semibold"><NotebookPen className="h-4 w-4" /> 메모장</h2>
              <button aria-label="닫기" onClick={() => setMemoOpen(false)} className="rounded p-1 hover:bg-stone-100 dark:hover:bg-stone-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              value={memo}
              onChange={(e) => saveMemo(e.target.value)}
              placeholder="구절을 선택해 '메모장에'를 누르면 여기에 모입니다. 직접 입력·수정도 할 수 있어요."
              className="flex-1 resize-none bg-transparent p-4 font-serif text-[15px] leading-relaxed outline-none"
            />
            <div className="flex gap-2 border-t border-stone-200 p-3 dark:border-stone-800">
              <button
                onClick={() => {
                  if (memo.trim() && confirm("메모장을 비울까요?")) saveMemo("");
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Trash2 className="h-4 w-4" /> 비우기
              </button>
              <button
                onClick={downloadMemo}
                disabled={!memo.trim()}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                <Download className="h-4 w-4" /> .txt 저장
              </button>
              <button
                onClick={async () => notify((await copyText(memo)) ? "메모장 내용을 복사했습니다" : "복사하지 못했습니다")}
                disabled={!memo.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-40"
              >
                <ClipboardCopy className="h-4 w-4" /> 전체 복사
              </button>
            </div>
          </aside>
        </div>
      )}

      {present && <Presenter verses={present} onClose={closePresenter} />}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center">
          <div className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">{toast}</div>
        </div>
      )}
    </div>
  );
}
