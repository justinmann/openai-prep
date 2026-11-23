import { typescriptLanguage } from '@codemirror/lang-javascript';
import { pythonLanguage } from '@codemirror/lang-python';
import { classHighlighter, highlightCode } from '@lezer/highlight';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, TabContent, TabPicker } from 'ugly-app/client';
import { guides } from '../../shared/guide';
import type {
  ApiGroup,
  GuideEntry,
  GuideTab,
  ModuleGroup,
} from '../../shared/guide';
import type { Language } from '../../shared/questions';
import { Markdown } from './Markdown';

// The "?" language guide: tabs of runnable snippets plus full module lists.
// Opened with router.openPopup from the coding page.

function Highlighted({
  code,
  lang,
}: {
  code: string;
  lang: Language;
}): React.ReactElement {
  const nodes = useMemo(() => {
    const out: React.ReactNode[] = [];
    const parser = (lang === 'python' ? pythonLanguage : typescriptLanguage)
      .parser;
    let k = 0;
    highlightCode(
      code,
      parser.parse(code),
      classHighlighter,
      (text, classes) => {
        out.push(
          classes ? (
            <span key={k++} className={classes}>
              {text}
            </span>
          ) : (
            text
          ),
        );
      },
      () => {
        out.push('\n');
      },
    );
    return out;
  }, [code, lang]);
  return (
    <pre className="guide-code">
      <code>{nodes}</code>
    </pre>
  );
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      data-id={`copy-${id}`}
      aria-label="Copy snippet"
      onClick={() => {
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 1200);
          })
          .catch(() => undefined);
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function Entry({
  e,
  lang,
  id,
}: {
  e: GuideEntry;
  lang: Language;
  id: string;
}): React.ReactElement {
  return (
    <div className="guide-entry">
      <div className="guide-entry-head">
        <h4>{e.title}</h4>
        <CopyButton text={e.code} id={id} />
      </div>
      {e.note && <Markdown text={e.note} />}
      <Highlighted code={e.code} lang={lang} />
    </div>
  );
}

function Modules({ groups }: { groups: ModuleGroup[] }): React.ReactElement {
  return (
    <>
      {groups.map((g) => (
        <div key={g.heading} className="guide-modules">
          <h4>
            {g.heading} <span className="muted">({g.names.length})</span>
          </h4>
          {g.note && <p className="muted small">{g.note}</p>}
          <div className="chips">
            {g.names.map((n) => (
              <code key={n} className="chip">
                {n}
              </code>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Api({ groups }: { groups: ApiGroup[] }): React.ReactElement {
  return (
    <>
      {groups.map((g) => (
        <div key={g.title} className="guide-api" data-id={`api-${g.title}`}>
          <h4>
            {g.title}{' '}
            <span className="muted">
              {g.prefix ? `${g.prefix}… ` : ''}({g.members.length})
            </span>
          </h4>
          <dl>
            {g.members.map((m) => (
              <div key={m.sig} className="api-row">
                <dt>
                  <code>{m.sig}</code>
                </dt>
                {m.doc && <dd className="muted small">{m.doc}</dd>}
              </div>
            ))}
          </dl>
        </div>
      ))}
    </>
  );
}

function TabBody({
  tab,
  lang,
}: {
  tab: GuideTab;
  lang: Language;
}): React.ReactElement {
  return (
    <div className="guide-tab" data-id={`guide-tab-${tab.id}`}>
      {tab.intro && <Markdown text={tab.intro} />}
      {tab.entries.map((e, i) => (
        <Entry key={e.title} e={e} lang={lang} id={`${tab.id}-${i}`} />
      ))}
      {tab.modules && <Modules groups={tab.modules} />}
      {tab.api && <Api groups={tab.api} />}
    </div>
  );
}

const norm = (s: string) => s.toLowerCase();

/** Matches across every tab: entries by title/note/code, modules by name. */
function SearchResults({
  query,
  tabs,
  lang,
}: {
  query: string;
  tabs: GuideTab[];
  lang: Language;
}): React.ReactElement {
  const q = norm(query.trim());
  const hits = tabs
    .map((t) => ({
      tab: t,
      entries: t.entries.filter((e) =>
        norm(`${e.title} ${e.note ?? ''} ${e.code}`).includes(q),
      ),
      modules: (t.modules ?? [])
        .map((g) => ({
          ...g,
          names: g.names.filter((n) => norm(n).includes(q)),
        }))
        .filter((g) => g.names.length > 0),
      api: (t.api ?? [])
        .map((g) => ({
          ...g,
          members: g.members.filter((m) =>
            norm(`${g.prefix}${m.name} ${m.sig} ${m.doc}`).includes(q),
          ),
        }))
        .filter((g) => g.members.length > 0),
    }))
    .filter((h) => h.entries.length || h.modules.length || h.api.length);
  if (!hits.length)
    return <div className="empty">Nothing matches “{query.trim()}”.</div>;
  return (
    <div className="guide-tab" data-id="guide-search-results">
      {hits.map((h) => (
        <section key={h.tab.id}>
          <div className="guide-hit-head">{h.tab.label}</div>
          {h.entries.map((e, i) => (
            <Entry key={e.title} e={e} lang={lang} id={`s-${h.tab.id}-${i}`} />
          ))}
          {h.modules.length > 0 && <Modules groups={h.modules} />}
          {h.api.length > 0 && <Api groups={h.api} />}
        </section>
      ))}
    </div>
  );
}

export function LanguageGuide({
  initial,
  onClose,
}: {
  initial: Language;
  onClose: () => void;
}): React.ReactElement {
  const [lang, setLang] = useState<Language>(initial);
  const guide = guides[lang];
  const ids = guide.tabs.map((t) => t.id);
  const [tab, setTab] = useState<string>(ids[0] ?? '');
  const [query, setQuery] = useState('');
  const selected = ids.includes(tab) ? tab : (ids[0] ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const dict = Object.fromEntries(
    guide.tabs.map((t) => [
      t.id,
      { text: t.label, content: <TabBody tab={t} lang={lang} /> },
    ]),
  );

  return (
    <div
      className="guide"
      role="dialog"
      aria-label="Language guide"
      data-id="language-guide"
    >
      <div className="guide-head">
        <h2>{lang === 'python' ? 'Python' : 'TypeScript'} guide</h2>
        <div className="seg" role="group" aria-label="Guide language">
          {(['typescript', 'python'] as const).map((l) => (
            <Button
              key={l}
              size="sm"
              variant={lang === l ? 'secondary' : 'ghost'}
              data-id={`guide-lang-${l}`}
              aria-pressed={lang === l}
              onClick={() => {
                setLang(l);
              }}
            >
              {l === 'typescript' ? 'TypeScript' : 'Python'}
            </Button>
          ))}
        </div>
        <div className="guide-search">
          <Input
            placeholder="Search snippets, methods and modules"
            value={query}
            onChange={setQuery}
            data-id="guide-search"
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          data-id="guide-close"
          aria-label="Close guide"
          onClick={onClose}
        >
          ✕
        </Button>
      </div>
      {query.trim() ? (
        <div className="guide-body">
          <SearchResults query={query} tabs={guide.tabs} lang={lang} />
        </div>
      ) : (
        <>
          <div className="guide-tabs">
            <TabPicker
              tabDictionary={dict}
              tabs={ids}
              selectedTab={selected}
              setSelectedTab={setTab}
            />
          </div>
          <div className="guide-body">
            <TabContent
              tabDictionary={dict}
              tabs={ids}
              selectedTab={selected}
            />
          </div>
        </>
      )}
    </div>
  );
}
