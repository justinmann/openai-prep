import React from 'react';

// Minimal markdown for question prompts: ### headings, paragraphs, - lists,
// ``` fenced code, `inline code`, **bold**. Content is ours, but everything is
// rendered as React text, never as HTML.

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`'))
      out.push(<code key={`${keyBase}-${i++}`}>{tok.slice(1, -1)}</code>);
    else
      out.push(<strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }): React.ReactElement {
  const blocks: React.ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```'))
        body.push(lines[i++]!);
      i++;
      blocks.push(
        <pre key={k++} className="md-pre">
          <code>{body.join('\n')}</code>
        </pre>,
      );
    } else if (line.startsWith('### ')) {
      blocks.push(<h4 key={k++}>{inline(line.slice(4), `h${k}`)}</h4>);
      i++;
    } else if (/^\s*- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i]!))
        items.push(lines[i++]!.replace(/^\s*- /, ''));
      const base = k++;
      blocks.push(
        <ul key={base}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `l${base}-${j}`)}</li>
          ))}
        </ul>,
      );
    } else if (line.trim() === '') {
      i++;
    } else {
      const para: string[] = [];
      while (
        i < lines.length &&
        lines[i]!.trim() !== '' &&
        !lines[i]!.startsWith('```') &&
        !/^\s*- /.test(lines[i]!) &&
        !lines[i]!.startsWith('### ')
      )
        para.push(lines[i++]!);
      const base = k++;
      blocks.push(<p key={base}>{inline(para.join(' '), `p${base}`)}</p>);
    }
  }
  return <div className="md">{blocks}</div>;
}
