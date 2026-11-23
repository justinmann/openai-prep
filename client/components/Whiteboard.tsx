import '@excalidraw/excalidraw/index.css';
import {
  Excalidraw,
  exportToBlob,
  hashElementsVersion,
  restoreElements,
} from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import React, { useMemo, useRef } from 'react';

// The Excalidraw whiteboard OpenAI's virtual system design round uses. Loaded
// lazily by DesignPage: the package is large and only that page needs it.

interface Props {
  /** Raw saved elements; validated and repaired by Excalidraw's `restore`. */
  initial: unknown[];
  /** Fires only when the drawing itself changes, not on pan/zoom/selection. */
  onChange: (elements: readonly ExcalidrawElement[]) => void;
}

/** Saved JSON back into valid elements; restore() drops or repairs anything malformed. */
export function restoreSaved(saved: unknown[]): ExcalidrawElement[] {
  return restoreElements(
    saved as Parameters<typeof restoreElements>[0],
    null,
  ).filter((e) => !e.isDeleted);
}

export default function Whiteboard({
  initial,
  onChange,
}: Props): React.ReactElement {
  const initialData = useMemo(
    () => ({
      elements: restoreSaved(initial),
      scrollToContent: true,
    }),
    // Initial data is read once on mount, like Excalidraw itself does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const version = useRef(hashElementsVersion(initialData.elements));

  return (
    <div className="whiteboard" data-id="design-whiteboard">
      <Excalidraw
        initialData={initialData}
        theme="dark"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
          // Pasted images would need file storage this app does not keep.
          tools: { image: false },
        }}
        onChange={(elements) => {
          const v = hashElementsVersion(elements);
          if (v === version.current) return;
          version.current = v;
          onChange(elements);
        }}
      />
    </div>
  );
}

// The package's own declaration points at '@excalidraw/utils', which it does
// not ship, so the type resolves to an error. This is the part of it we use.
const toBlob = exportToBlob as unknown as (opts: {
  elements: readonly ExcalidrawElement[];
  appState: Record<string, unknown>;
  files: null;
  mimeType: string;
  maxWidthOrHeight: number;
  exportPadding: number;
}) => Promise<Blob>;

/** A light-background PNG of the drawing for the grader, as a data URL. */
export async function exportDiagramPng(
  elements: readonly ExcalidrawElement[],
): Promise<string> {
  const blob = await toBlob({
    elements: elements.filter((e) => !e.isDeleted),
    appState: {
      exportBackground: true,
      exportWithDarkMode: false,
      viewBackgroundColor: '#ffffff',
    },
    files: null,
    mimeType: 'image/png',
    maxWidthOrHeight: 1600,
    exportPadding: 24,
  });
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') resolve(r.result);
      else reject(new Error('Could not read the diagram image'));
    };
    r.onerror = () => {
      reject(r.error ?? new Error('Could not read the diagram image'));
    };
    r.readAsDataURL(blob);
  });
}
