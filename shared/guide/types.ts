// Language guide shown from the "?" button on coding pages. Content is data
// so every snippet can be executed by tests/unit/guide.test.ts.

export interface GuideEntry {
  title: string;
  /**
   * A self-contained snippet. It runs as the body of an async function, so it
   * may use `await`; results are shown as `// → value` (TS) or `# → value`
   * (Python) comments.
   */
  code: string;
  /** One or two sentences: when to use it, or the trap to avoid. */
  note?: string;
  /** False when the snippet needs the network (npm / Pyodide packages). */
  run?: false;
}

export interface ModuleGroup {
  heading: string;
  note?: string;
  names: string[];
}

export interface GuideTab {
  id: string;
  label: string;
  intro?: string;
  entries: GuideEntry[];
  /** Full lists of importable modules, rendered as compact chips. */
  modules?: ModuleGroup[];
}

export interface LanguageGuide {
  language: 'typescript' | 'python';
  tabs: GuideTab[];
}
