import { describe, expect, it } from 'vitest';
import {
  countDrawn,
  diagramOutline,
  type DiagramElement,
} from '../../shared/diagram';

const box = (
  id: string,
  x: number,
  y: number,
  w = 100,
  h = 60,
  type = 'rectangle',
): DiagramElement => ({ id, type, x, y, width: w, height: h });

const label = (containerId: string, text: string): DiagramElement => ({
  id: `${containerId}-t`,
  type: 'text',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  text,
  containerId,
});

const arrow = (
  id: string,
  x: number,
  y: number,
  dx: number,
  dy: number,
  bind?: { from?: string; to?: string },
): DiagramElement => ({
  id,
  type: 'arrow',
  x,
  y,
  width: Math.abs(dx),
  height: Math.abs(dy),
  points: [
    [0, 0],
    [dx, dy],
  ],
  startBinding: bind?.from ? { elementId: bind.from } : null,
  endBinding: bind?.to ? { elementId: bind.to } : null,
});

describe('diagramOutline', () => {
  it('is empty for an empty or fully deleted board', () => {
    expect(diagramOutline([])).toBe('');
    expect(diagramOutline([{ ...box('a', 0, 0), isDeleted: true }])).toBe('');
  });

  it('names boxes by their labels and follows arrow bindings', () => {
    const out = diagramOutline([
      box('api', 0, 0),
      label('api', 'API\ngateway'),
      box('q', 400, 0),
      label('q', 'Kafka'),
      arrow('a1', 500, 500, 10, 10, { from: 'api', to: 'q' }),
      label('a1', 'events'),
    ]);
    expect(out).toContain('- "API gateway" (rectangle)');
    expect(out).toContain('- "API gateway" → "Kafka": "events"');
  });

  it('resolves unbound arrow ends to the box they touch, innermost first', () => {
    const out = diagramOutline([
      box('region', 0, 0, 1000, 600),
      label('region', 'us-east'),
      box('svc', 50, 50),
      label('svc', 'Dispatcher'),
      box('db', 700, 50, 100, 60, 'ellipse'),
      label('db', 'Postgres'),
      // From inside Dispatcher to just short of Postgres (within the snap distance).
      arrow('a', 100, 80, 590, 0),
    ]);
    expect(out).toContain('- "Dispatcher" (rectangle), inside "us-east"');
    expect(out).toContain('- "Dispatcher" → "Postgres"');
  });

  it('reports dangling arrows, unlabelled shapes and free text', () => {
    const out = diagramOutline([
      box('x', 0, 0),
      arrow('a', 2000, 2000, 50, 0),
      {
        id: 'n',
        type: 'text',
        x: 0,
        y: 300,
        width: 50,
        height: 20,
        text: '20k events/s',
      },
      { id: 'f', type: 'freedraw', x: 0, y: 0, width: 5, height: 5 },
    ]);
    expect(out).toContain('- unlabelled rectangle #1 (rectangle)');
    expect(out).toContain('- (nothing) → (nothing)');
    expect(out).toContain('- "20k events/s"');
    expect(out).toContain('1 freehand/other element(s)');
  });

  it('counts drawn elements without double-counting labels', () => {
    expect(
      countDrawn([box('a', 0, 0), label('a', 'A'), arrow('b', 0, 0, 1, 1)]),
    ).toBe(2);
  });
});
