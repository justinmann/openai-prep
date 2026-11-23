import React, { useState } from 'react';
import { Button } from 'ugly-app/client';
import { findCoding, questionIn } from '../../shared/questions';
import type { CodingQuestion, Language } from '../../shared/questions';
import { jsonLdFor } from '../../shared/seo';
import { CompanyPicker } from '../components/CompanyPicker';
import { JsonLd } from '../components/JsonLd';
import { NotFound } from '../components/NotFound';
import { CodingProblem } from '../components/QuestionBits';
import { SignInGate, useSignedIn } from '../components/SignIn';
import { TopBar } from '../components/TopBar';
import { useWorkspace } from '../workspaces';

// Server-rendered: the problem is public. Signed-in visitors get the editor
// (CodingWorkspace, loaded in the browser only); everyone else gets a sign-in
// prompt where the editor would be.

/** Survives the remount when the session resolves; per tab, per question. */
let pendingPick: { id: string; lang: Language } | null = null;

export default function CodingPage({ id }: { id: string }): React.ReactElement {
  const q = findCoding(id);
  const signedIn = useSignedIn();
  const Workspace = useWorkspace('coding', signedIn && Boolean(q));
  // A language picked before the editor arrives carries over into it. The
  // session resolves after the server-rendered page hydrates, and signing in
  // swaps in a new app tree (remounting this page), so the pick lives outside
  // React state too.
  const [picked, setPickedState] = useState<Language | null>(() =>
    pendingPick?.id === id ? pendingPick.lang : null,
  );
  const setPicked = (l: Language) => {
    pendingPick = { id, lang: l };
    setPickedState(l);
  };
  if (!q) return <NotFound what={`coding question “${id}”`} />;
  if (signedIn && Workspace)
    return <Workspace q={q} {...(picked ? { lang: picked } : {})} />;
  return (
    <CodingPreview
      q={q}
      status={signedIn ? 'Loading the editor…' : null}
      lang={picked ?? 'typescript'}
      onLang={setPicked}
    />
  );
}

/** The workspace layout without the editor: problem on the left. */
export function CodingPreview({
  q,
  status,
  lang = 'typescript',
  onLang,
}: {
  q: CodingQuestion;
  /** Shown in place of the editor; null = the sign-in prompt. */
  status: React.ReactNode;
  lang?: Language;
  onLang?: (l: Language) => void;
}): React.ReactElement {
  const setLang = (l: Language) => onLang?.(l);
  const view = questionIn(q, lang);
  return (
    <div className="workspace">
      <JsonLd data={jsonLdFor('coding/:id', { id: q.id })} />
      <TopBar title={q.title} heading>
        <CompanyPicker />
        {q.python && (
          <div className="seg" role="group" aria-label="Language">
            {(['typescript', 'python'] as const).map((l) => (
              <Button
                key={l}
                size="sm"
                variant={lang === l ? 'secondary' : 'ghost'}
                data-id={`lang-${l}`}
                onClick={() => {
                  setLang(l);
                }}
              >
                {l === 'typescript' ? 'TypeScript' : 'Python'}
              </Button>
            ))}
          </div>
        )}
      </TopBar>
      <div className="split">
        <aside className="pane pane-left">
          <CodingProblem q={q} view={view} />
        </aside>
        <main className="pane pane-right">
          {status === null ? (
            <SignInGate
              title="Write and run your solution"
              body={`Sign in to code ${q.title} in TypeScript or Python, run the ${q.parts.reduce((n, p) => n + p.tests.length, 0)} tests in your browser, and save your progress.`}
            />
          ) : (
            <div className="notfound" data-id="workspace-loading">
              {status}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
