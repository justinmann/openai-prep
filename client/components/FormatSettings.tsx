import React from 'react';
import { Button } from 'ugly-app/client';
import type { FormatSettings } from '../../shared/format';
import type { Language } from '../../shared/questions';

// Formatting options popup: mode (manual / auto on run) and the basic Prettier
// or Ruff options for the language on screen.

function Seg<T extends string | number | boolean>({
  label,
  id,
  value,
  options,
  onChange,
}: {
  label: string;
  id: string;
  value: T;
  options: { value: T; text: string }[];
  onChange: (v: T) => void;
}): React.ReactElement {
  return (
    <div className="fmt-row">
      <span className="fmt-label">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <Button
            key={String(o.value)}
            size="sm"
            variant={value === o.value ? 'secondary' : 'ghost'}
            data-id={`fmt-${id}-${String(o.value)}`}
            onClick={() => {
              onChange(o.value);
            }}
          >
            {o.text}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function FormatSettingsPopup({
  lang,
  prefs,
  onChange,
  onClose,
}: {
  lang: Language;
  prefs: FormatSettings;
  onChange: (patch: Partial<FormatSettings>) => void;
  onClose: () => void;
}): React.ReactElement {
  const ts = lang === 'typescript';
  return (
    <div
      className="picker fmt-popup"
      role="dialog"
      aria-label="Formatting settings"
      data-id="format-settings"
    >
      <div className="picker-head">
        <h3>Formatting</h3>
        <Button
          size="sm"
          variant="ghost"
          data-id="format-settings-close"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </Button>
      </div>
      <p className="muted small">
        {ts ? 'Prettier' : 'Ruff (Black-compatible)'} formats your code. Format
        any time with <span className="kbd">⇧⌥F</span>.
      </p>
      <Seg
        label="Mode"
        id="mode"
        value={prefs.mode}
        options={[
          { value: 'manual', text: 'Manual' },
          { value: 'auto', text: 'Auto (before each run)' },
        ]}
        onChange={(mode) => {
          onChange({ mode });
        }}
      />
      <Seg
        label="Line width"
        id="width"
        value={prefs.printWidth}
        options={[
          { value: 80, text: '80' },
          { value: 100, text: '100' },
          { value: 120, text: '120' },
        ]}
        onChange={(printWidth) => {
          onChange({ printWidth });
        }}
      />
      <Seg
        label="Indent"
        id="indent"
        value={ts ? prefs.tabWidth : prefs.pyIndent}
        options={[
          { value: 2, text: '2 spaces' },
          { value: 4, text: '4 spaces' },
        ]}
        onChange={(n) => {
          onChange(ts ? { tabWidth: n } : { pyIndent: n });
        }}
      />
      <Seg
        label="Quotes"
        id="quotes"
        value={prefs.singleQuote}
        options={[
          { value: true, text: "'single'" },
          { value: false, text: '"double"' },
        ]}
        onChange={(singleQuote) => {
          onChange({ singleQuote });
        }}
      />
      {ts && (
        <>
          <Seg
            label="Semicolons"
            id="semi"
            value={prefs.semi}
            options={[
              { value: true, text: 'Always' },
              { value: false, text: 'Only when needed' },
            ]}
            onChange={(semi) => {
              onChange({ semi });
            }}
          />
          <Seg
            label="Trailing commas"
            id="trailing"
            value={prefs.trailingComma}
            options={[
              { value: 'all', text: 'All' },
              { value: 'es5', text: 'ES5' },
              { value: 'none', text: 'None' },
            ]}
            onChange={(trailingComma) => {
              onChange({ trailingComma });
            }}
          />
          <Seg
            label="Bracket spacing"
            id="brackets"
            value={prefs.bracketSpacing}
            options={[
              { value: true, text: '{ a }' },
              { value: false, text: '{a}' },
            ]}
            onChange={(bracketSpacing) => {
              onChange({ bracketSpacing });
            }}
          />
        </>
      )}
      <p className="muted small">Saved in this browser.</p>
    </div>
  );
}
