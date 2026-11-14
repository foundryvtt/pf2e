import type { ActiveDrag } from "@module/sheet/drag-source.ts";
import { gapsEqual, type Gap, type GapIndex } from "./drop-gaps.ts";

/** Where a drag over a list would land */
type ListHit =
    | { kind: "gap"; gap: Gap }
    /** On a row: into a container, or stacked onto the row */
    | { kind: "into" | "stack"; key: string }
    /** A list as a whole (e.g. an empty list's header) */
    | { kind: "list"; id: string }
    /** The whole drop zone, in no particular place */
    | { kind: "zone" };

interface Band {
    top: number;
    bottom: number;
}

/** A row's measurements, in the pointer's coordinates */
interface RowGeometry {
    /** The row itself, without anything shown under it */
    row: Band;
    /** The bottom of the row's whole block: summary, contents and all */
    blockBottom: number;
    /** An open container's contents list */
    contents: Band | null;
    /** Where the list's indents start */
    left: number;
    /** The width of one nesting level */
    indent: number;
}

interface RowHitOptions {
    /** The row is a container: its middle takes drops into it */
    container?: boolean;
    /** The dragged row can stack onto this one, on its middle half */
    stackable?: boolean;
}

/**
 * The hit for a pointer over a row's block. Plain rows split at their midline, or stack on their middle half.
 * A container's band (its row down to its contents) is before / into / first-or-after by quarters of the row's
 * height, and its open contents split into before the first row and after the last.
 */
function resolveRowHit(
    index: GapIndex,
    key: string,
    geometry: RowGeometry,
    point: { x: number; y: number },
    { container = false, stackable = false }: RowHitOptions = {},
): ListHit {
    const { row, contents } = geometry;
    const { y } = point;
    const quarter = (row.bottom - row.top) / 4;
    const children = index.childrenOf(key) ?? [];
    const firstChild = children[0];
    const gap = (gap: Gap): ListHit => ({ kind: "gap", gap });
    const after = (k: string): Gap => levelAfter(index, k, point.x, geometry.left, geometry.indent);

    if (contents && y >= contents.top) {
        const lastChild = children.at(-1);
        if (!firstChild || !lastChild) return { kind: "into", key };
        return gap(y < (contents.top + contents.bottom) / 2 ? index.before(firstChild) : after(lastChild));
    }

    if (container) {
        const bandBottom = contents?.top ?? geometry.blockBottom;
        if (y < row.top + quarter) return gap(index.before(key));
        if (y > bandBottom - quarter) return gap(firstChild ? index.before(firstChild) : after(key));
        return { kind: "into", key };
    }

    if (stackable && y >= row.top + quarter && y <= row.bottom - quarter) return { kind: "stack", key };
    return gap(y < (row.top + row.bottom) / 2 ? index.before(key) : after(key));
}

/**
 * The gap under a row. When the row closes its list and its container's too, those ends share one boundary, so
 * the pointer's x picks the level: left of a row's indent means the level above.
 */
function levelAfter(index: GapIndex, key: string, x: number, left: number, indent: number): Gap {
    const depthOf = (k: string): number => {
        let depth = 0;
        for (let parent = index.parentOf(k); parent; parent = index.parentOf(parent)) depth += 1;
        return depth;
    };
    let current = key;
    let gap = index.after(current);
    while ("end" in gap && x < left + depthOf(current) * indent) {
        const parent = index.parentOf(current);
        if (!parent) break;
        current = parent;
        gap = index.after(current);
    }
    return gap;
}

/** Whether a drop would do nothing or be refused: onto or inside the dragged row, or the gap it already sits in */
function isNoopHit(index: GapIndex, hit: ListHit, drag: ActiveDrag | null): boolean {
    if (!drag || !index.has(drag.key) || hit.kind === "zone" || hit.kind === "list") return false;
    const inside = (key: string): boolean => key === drag.key || index.contains(drag.key, key);
    if (hit.kind !== "gap") return inside(hit.key);
    const gap = hit.gap;
    return inside("before" in gap ? gap.before : gap.end) || gapsEqual(gap, index.after(drag.key));
}

/**
 * Whether two hits are levels of one boundary: the stacked ends under the last row of a nested list, which the
 * pointer's x picks between (see `levelAfter`). Moving between them changes the indent, not the place.
 */
function sameBoundary(index: GapIndex, a: ListHit | null, b: ListHit | null): boolean {
    if (a?.kind !== "gap" || b?.kind !== "gap" || gapsEqual(a.gap, b.gap)) return false;
    const levels = (gap: Gap): Gap[] => {
        const chain = [gap];
        for (let current = gap; "end" in current;) {
            const parent = index.parentOf(current.end);
            if (!parent) break;
            current = index.after(parent);
            chain.push(current);
        }
        return chain;
    };
    return levels(a.gap).some((g) => gapsEqual(g, b.gap)) || levels(b.gap).some((g) => gapsEqual(g, a.gap));
}

/** A gap as a neighbor to sort against, for flat lists */
function gapToSibling(gap: Gap): { key: string; before: boolean } {
    return "before" in gap ? { key: gap.before, before: true } : { key: gap.end, before: false };
}

export { gapToSibling, isNoopHit, levelAfter, resolveRowHit, sameBoundary };
export type { Band, ListHit, RowGeometry, RowHitOptions };
