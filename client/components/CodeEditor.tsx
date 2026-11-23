import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { basicSetup } from 'codemirror';
import React, { useEffect, useRef } from 'react';

interface Props {
  'value': string;
  'onChange': (v: string) => void;
  'language': 'typescript' | 'markdown';
  /** Cmd/Ctrl+Enter */
  'onSubmit'?: () => void;
  'placeholder'?: string;
  'data-id': string;
  'aria-label': string;
}

// CodeMirror 6, mounted once. External value changes (reset, show solution)
// are pushed in as a single replace transaction.
export function CodeEditor(props: Props): React.ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: props.value,
        extensions: [
          keymap.of([
            {
              key: 'Mod-Enter',
              run: () => {
                latest.current.onSubmit?.();
                return true;
              },
            },
            indentWithTab,
          ]),
          basicSetup,
          props.language === 'typescript'
            ? javascript({ typescript: true })
            : [markdown(), EditorView.lineWrapping],
          oneDark,
          EditorView.theme({
            '&': { height: '100%', fontSize: '13.5px' },
            '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.55' },
            '&.cm-focused': { outline: 'none' },
          }),
          ...(props.placeholder ? [cmPlaceholder(props.placeholder)] : []),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) latest.current.onChange(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({
            'aria-label': props['aria-label'],
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // Mount once; later prop changes flow through `latest` and the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (cur !== props.value)
      v.dispatch({ changes: { from: 0, to: cur.length, insert: props.value } });
  }, [props.value]);

  return <div ref={host} className="editor" data-id={props['data-id']} />;
}
