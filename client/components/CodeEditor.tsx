import { acceptCompletion } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { basicSetup } from 'codemirror';
import React, { useEffect, useRef } from 'react';

/** Imperative access for formatting: read the cursor, replace the text. */
export interface EditorHandle {
  cursor: () => number;
  /** Replace the whole document and put the cursor at `cursor`. */
  replace: (text: string, cursor: number) => void;
}

interface Props {
  'value': string;
  'onChange': (v: string) => void;
  'language': 'typescript' | 'python' | 'markdown';
  /** Cmd/Ctrl+Enter */
  'onSubmit'?: () => void;
  /** Shift+Cmd/Ctrl+Enter */
  'onRunCode'?: () => void;
  /** Shift+Alt+F: format the document. */
  'onFormat'?: () => void;
  'handle'?: React.RefObject<EditorHandle | null>;
  'placeholder'?: string;
  'data-id': string;
  'aria-label': string;
  /** Load autocomplete, error underlines and hover types for the language. */
  'services'?: boolean;
}

async function loadServices(language: Props['language']) {
  if (language === 'typescript')
    return (await import('../lang/typescript')).typescriptServices();
  if (language === 'python')
    return (await import('../lang/python')).pythonServices();
  return [];
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
    const services = new Compartment();
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: props.value,
        extensions: [
          keymap.of([
            {
              key: 'Shift-Mod-Enter',
              run: () => {
                latest.current.onRunCode?.();
                return true;
              },
            },
            {
              key: 'Mod-Enter',
              run: () => {
                latest.current.onSubmit?.();
                return true;
              },
            },
            // Tab accepts the highlighted suggestion when the list is open
            // (Enter still works); otherwise it indents.
            { key: 'Tab', run: acceptCompletion },
            indentWithTab,
          ]),
          basicSetup,
          props.language === 'typescript'
            ? javascript({ typescript: true })
            : props.language === 'python'
              ? python()
              : [markdown(), EditorView.lineWrapping],
          oneDark,
          EditorView.theme({
            '&': { height: '100%', fontSize: '13.5px' },
            '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.55' },
            '&.cm-focused': { outline: 'none' },
          }),
          ...(props.placeholder ? [cmPlaceholder(props.placeholder)] : []),
          services.of([]),
          // Shift+Alt+F formats (VS Code's binding). Matched by physical key:
          // on macOS Option turns F into "Ï", and CodeMirror's keymap skips
          // Option combinations there because they usually type characters.
          EditorView.domEventHandlers({
            keydown: (e) => {
              if (
                e.code !== 'KeyF' ||
                !e.shiftKey ||
                !e.altKey ||
                e.metaKey ||
                e.ctrlKey ||
                !latest.current.onFormat
              )
                return false;
              e.preventDefault();
              latest.current.onFormat();
              return true;
            },
          }),
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
    if (props.handle)
      props.handle.current = {
        cursor: () => v.state.selection.main.head,
        replace: (text, cursor) => {
          const cur = v.state.doc.toString();
          if (cur === text) return;
          v.dispatch({
            changes: { from: 0, to: cur.length, insert: text },
            selection: { anchor: Math.max(0, Math.min(cursor, text.length)) },
            scrollIntoView: true,
          });
        },
      };
    let alive = true;
    if (props.services)
      loadServices(props.language)
        .then((ext) => {
          if (alive) v.dispatch({ effects: services.reconfigure(ext) });
        })
        .catch((err: unknown) => {
          // The editor still works without them; just no autocomplete/lint.
          console.warn('[editor] language services failed to load', err);
        });
    return () => {
      alive = false;
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
