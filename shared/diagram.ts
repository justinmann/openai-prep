// Turns an Excalidraw scene into a plain-text outline for the grader: which
// boxes exist, what they are labelled, and which arrows connect what. The
// grader also gets a PNG of the canvas, but the outline is what makes the
// topology unambiguous (an arrow that merely passes near a box in the image is
// not a connection). Typed structurally so this stays free of the Excalidraw
// package and runs in unit tests.

export interface DiagramElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  text?: string;
  containerId?: string | null;
  name?: string | null;
  points?: readonly (readonly [number, number])[];
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
}

const SHAPES = new Set(['rectangle', 'ellipse', 'diamond', 'frame']);
const LINKS = new Set(['arrow', 'line']);
/** An unbound arrow end this close to a box (in scene px) counts as touching it. */
const SNAP = 24;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

interface Box {
  el: DiagramElement;
  label: string;
}

/** The parts of a scene that carry meaning; deleted and empty elements are dropped. */
export function liveElements(
  elements: readonly DiagramElement[],
): DiagramElement[] {
  return elements.filter(
    (e) => !e.isDeleted && !(e.type === 'text' && !clean(e.text ?? '')),
  );
}

/** Count of the things a candidate actually drew (labels inside shapes don't count twice). */
export function countDrawn(elements: readonly DiagramElement[]): number {
  return liveElements(elements).filter(
    (e) => !(e.type === 'text' && e.containerId),
  ).length;
}

function inside(px: number, py: number, e: DiagramElement, pad: number) {
  return (
    px >= e.x - pad &&
    px <= e.x + e.width + pad &&
    py >= e.y - pad &&
    py <= e.y + e.height + pad
  );
}

function area(e: DiagramElement) {
  return Math.abs(e.width * e.height);
}

/** The smallest box containing the point, so a service inside a region box resolves to the service. */
function boxAt(px: number, py: number, boxes: Box[]): Box | undefined {
  return boxes
    .filter((b) => inside(px, py, b.el, SNAP))
    .sort((a, b) => area(a.el) - area(b.el))[0];
}

export function diagramOutline(elements: readonly DiagramElement[]): string {
  const live = liveElements(elements);
  if (!live.length) return '';

  const labelOf = new Map<string, string>();
  for (const t of live)
    if (t.type === 'text' && t.containerId)
      labelOf.set(
        t.containerId,
        [labelOf.get(t.containerId), clean(t.text ?? '')]
          .filter(Boolean)
          .join(' '),
      );

  const boxes: Box[] = live
    .filter((e) => SHAPES.has(e.type))
    .map((el) => ({
      el,
      label: labelOf.get(el.id) ?? (el.name ? clean(el.name) : ''),
    }));
  const byId = new Map(boxes.map((b) => [b.el.id, b]));

  // Name every box once; unlabelled ones get a stable placeholder so arrows can refer to them.
  let unnamed = 0;
  const nameOf = new Map<string, string>();
  for (const b of boxes)
    nameOf.set(
      b.el.id,
      b.label ? `"${b.label}"` : `unlabelled ${b.el.type} #${++unnamed}`,
    );

  const lines: string[] = [];

  if (boxes.length) {
    lines.push(`Components (${boxes.length}):`);
    for (const b of boxes) {
      const parent = boxes
        .filter(
          (o) =>
            o !== b &&
            area(o.el) > area(b.el) &&
            inside(b.el.x, b.el.y, o.el, 0) &&
            inside(b.el.x + b.el.width, b.el.y + b.el.height, o.el, 0),
        )
        .sort((x, y) => area(x.el) - area(y.el))[0];
      lines.push(
        `- ${nameOf.get(b.el.id)} (${b.el.type})${
          parent ? `, inside ${nameOf.get(parent.el.id)}` : ''
        }`,
      );
    }
  }

  const links = live.filter((e) => LINKS.has(e.type));
  if (links.length) {
    lines.push(`Connections (${links.length}):`);
    for (const l of links) {
      const pts = l.points?.length ? l.points : [[0, 0] as const];
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      const from =
        (l.startBinding && byId.get(l.startBinding.elementId)) ??
        boxAt(l.x + first[0], l.y + first[1], boxes);
      const to =
        (l.endBinding && byId.get(l.endBinding.elementId)) ??
        boxAt(l.x + last[0], l.y + last[1], boxes);
      const end = (b: Box | undefined) =>
        b ? nameOf.get(b.el.id)! : '(nothing)';
      const label = labelOf.get(l.id);
      lines.push(
        `- ${end(from)} ${l.type === 'arrow' ? '→' : '—'} ${end(to)}${
          label ? `: "${label}"` : ''
        }`,
      );
    }
  }

  const notes = live.filter((e) => e.type === 'text' && !e.containerId);
  if (notes.length) {
    lines.push('Free text on the board:');
    for (const n of notes) lines.push(`- "${clean(n.text ?? '')}"`);
  }

  const other = live.filter(
    (e) => !SHAPES.has(e.type) && !LINKS.has(e.type) && e.type !== 'text',
  );
  if (other.length)
    lines.push(
      `Also drawn: ${other.length} freehand/other element(s) (see the image).`,
    );

  return lines.join('\n');
}
