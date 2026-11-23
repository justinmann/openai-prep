import React from 'react';
import { findDesign } from '../../shared/questions';
import type { DesignQuestion } from '../../shared/questions';
import { jsonLdFor } from '../../shared/seo';
import { CompanyPicker } from '../components/CompanyPicker';
import { JsonLd } from '../components/JsonLd';
import { NotFound } from '../components/NotFound';
import { DesignBrief } from '../components/QuestionBits';
import { SignInGate, useSignedIn } from '../components/SignIn';
import { TopBar } from '../components/TopBar';
import { useWorkspace } from '../workspaces';

// Server-rendered: the brief is public. Signed-in visitors get the whiteboard
// and AI grading (DesignWorkspace, loaded in the browser only).

export default function DesignPage({ id }: { id: string }): React.ReactElement {
  const q = findDesign(id);
  const signedIn = useSignedIn();
  const Workspace = useWorkspace('design', signedIn && Boolean(q));
  if (!q) return <NotFound what={`design question “${id}”`} />;
  if (signedIn && Workspace) return <Workspace q={q} />;
  return (
    <DesignPreview q={q} status={signedIn ? 'Loading the whiteboard…' : null} />
  );
}

export function DesignPreview({
  q,
  status,
}: {
  q: DesignQuestion;
  /** Shown in place of the whiteboard; null = the sign-in prompt. */
  status: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="workspace">
      <JsonLd data={jsonLdFor('design/:id', { id: q.id })} />
      <TopBar title={q.title} heading>
        <CompanyPicker />
      </TopBar>
      <div className="split">
        <aside className="pane pane-left">
          <DesignBrief q={q} />
        </aside>
        <main className="pane pane-right">
          {status === null ? (
            <SignInGate
              title="Draw your design and get graded"
              body="Sign in to sketch your architecture on a whiteboard, write notes, and get AI feedback against these requirements and the rubric, weighted the way the company you pick grades."
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
