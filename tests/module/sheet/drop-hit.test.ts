import { GapIndex, type GapNode } from "@module/sheet/components/list/drop-gaps.ts";
import {
    gapToSibling,
    isNoopHit,
    levelAfter,
    resolveRowHit,
    sameBoundary,
    type RowGeometry,
} from "@module/sheet/components/list/drop-hit.ts";

const leaf = (key: string): GapNode => ({ key, children: null });
const open = (key: string, children: GapNode[]): GapNode => ({ key, children });

// weapons: sword, bow
// containers: pack (open: rope, sack (open: chalk)), chest (open, empty), box (collapsed)
const index = new GapIndex([
    { id: "weapons", nodes: [leaf("sword"), leaf("bow")] },
    {
        id: "containers",
        nodes: [open("pack", [leaf("rope"), open("sack", [leaf("chalk")])]), open("chest", []), leaf("box")],
    },
]);

/** A 20px row at y 100, indents of 16px from x 0 */
const row = (extra: Partial<RowGeometry> = {}): RowGeometry => ({
    row: { top: 100, bottom: 120 },
    blockBottom: 120,
    contents: null,
    left: 0,
    indent: 16,
    ...extra,
});
const at = (y: number, x = 200) => ({ x, y });

describe("resolveRowHit", () => {
    test("a plain row splits at its midline", () => {
        expect(resolveRowHit(index, "sword", row(), at(109))).toEqual({ kind: "gap", gap: { before: "sword" } });
        expect(resolveRowHit(index, "sword", row(), at(111))).toEqual({ kind: "gap", gap: { before: "bow" } });
        expect(resolveRowHit(index, "bow", row(), at(111))).toEqual({ kind: "gap", gap: { end: "bow" } });
    });

    test("a stackable row takes stacks on its middle half only", () => {
        const options = { stackable: true };
        expect(resolveRowHit(index, "sword", row(), at(104), options)).toEqual({
            kind: "gap",
            gap: { before: "sword" },
        });
        expect(resolveRowHit(index, "sword", row(), at(110), options)).toEqual({ kind: "stack", key: "sword" });
        expect(resolveRowHit(index, "sword", row(), at(116), options)).toEqual({
            kind: "gap",
            gap: { before: "bow" },
        });
    });

    test("a collapsed container is before, into, after by quarters", () => {
        const options = { container: true };
        expect(resolveRowHit(index, "box", row(), at(102), options)).toEqual({ kind: "gap", gap: { before: "box" } });
        expect(resolveRowHit(index, "box", row(), at(110), options)).toEqual({ kind: "into", key: "box" });
        expect(resolveRowHit(index, "box", row(), at(118), options)).toEqual({ kind: "gap", gap: { end: "box" } });
    });

    test("an open container's band ends at its first row", () => {
        // Row 100-120, capacity bar to 130, contents 130-170
        const geometry = row({ blockBottom: 170, contents: { top: 130, bottom: 170 } });
        const options = { container: true };
        expect(resolveRowHit(index, "pack", geometry, at(122), options)).toEqual({ kind: "into", key: "pack" });
        expect(resolveRowHit(index, "pack", geometry, at(127), options)).toEqual({
            kind: "gap",
            gap: { before: "rope" },
        });
    });

    test("on the contents list itself: before the first row or after the last", () => {
        const geometry = row({ blockBottom: 170, contents: { top: 130, bottom: 170 } });
        const options = { container: true };
        expect(resolveRowHit(index, "pack", geometry, at(135), options)).toEqual({
            kind: "gap",
            gap: { before: "rope" },
        });
        // The last content is sack, itself the end of pack's contents
        expect(resolveRowHit(index, "pack", geometry, at(165), options)).toEqual({ kind: "gap", gap: { end: "sack" } });
    });

    test("an open, empty container's contents list drops into it", () => {
        const geometry = row({ blockBottom: 140, contents: { top: 130, bottom: 140 } });
        expect(resolveRowHit(index, "chest", geometry, at(135), { container: true })).toEqual({
            kind: "into",
            key: "chest",
        });
    });
});

describe("levelAfter", () => {
    test("right of the row's indent stays at its level", () => {
        // chalk is two levels deep: its indent starts at 32
        expect(levelAfter(index, "chalk", 40, 0, 16)).toEqual({ end: "chalk" });
    });

    test("left of the indent climbs a level per indent", () => {
        expect(levelAfter(index, "chalk", 20, 0, 16)).toEqual({ end: "sack" });
        expect(levelAfter(index, "chalk", 5, 0, 16)).toEqual({ before: "chest" });
    });

    test("a row with a next sibling has only one gap under it", () => {
        expect(levelAfter(index, "rope", 0, 0, 16)).toEqual({ before: "sack" });
    });
});

describe("isNoopHit", () => {
    const drag = (key: string) => ({ key, type: "x" });

    test("the gaps around the dragged row", () => {
        expect(isNoopHit(index, { kind: "gap", gap: { before: "sword" } }, drag("sword"))).toBe(true);
        expect(isNoopHit(index, { kind: "gap", gap: { before: "bow" } }, drag("sword"))).toBe(true);
        expect(isNoopHit(index, { kind: "gap", gap: { end: "bow" } }, drag("sword"))).toBe(false);
    });

    test("onto or inside the dragged row", () => {
        expect(isNoopHit(index, { kind: "into", key: "pack" }, drag("pack"))).toBe(true);
        expect(isNoopHit(index, { kind: "into", key: "sack" }, drag("pack"))).toBe(true);
        expect(isNoopHit(index, { kind: "gap", gap: { before: "chalk" } }, drag("pack"))).toBe(true);
        expect(isNoopHit(index, { kind: "into", key: "chest" }, drag("pack"))).toBe(false);
    });

    test("drags from elsewhere are never no-ops", () => {
        expect(isNoopHit(index, { kind: "gap", gap: { before: "sword" } }, null)).toBe(false);
        expect(isNoopHit(index, { kind: "gap", gap: { before: "sword" } }, drag("other"))).toBe(false);
    });
});

describe("sameBoundary", () => {
    const gap = (g: { before: string } | { end: string }) => ({ kind: "gap" as const, gap: g });

    test("the stacked ends under a nested list's last row", () => {
        // chalk ends sack, which ends pack, whose next sibling is chest
        expect(sameBoundary(index, gap({ end: "chalk" }), gap({ end: "sack" }))).toBe(true);
        expect(sameBoundary(index, gap({ end: "sack" }), gap({ before: "chest" }))).toBe(true);
        expect(sameBoundary(index, gap({ before: "chest" }), gap({ end: "chalk" }))).toBe(true);
    });

    test("different places, the same gap, and non-gaps are not", () => {
        expect(sameBoundary(index, gap({ before: "rope" }), gap({ before: "sack" }))).toBe(false);
        expect(sameBoundary(index, gap({ end: "chalk" }), gap({ end: "chalk" }))).toBe(false);
        expect(sameBoundary(index, gap({ end: "bow" }), gap({ before: "chest" }))).toBe(false);
        expect(sameBoundary(index, { kind: "into", key: "pack" }, gap({ end: "chalk" }))).toBe(false);
        expect(sameBoundary(index, null, gap({ end: "chalk" }))).toBe(false);
    });
});

test("gapToSibling", () => {
    expect(gapToSibling({ before: "a" })).toEqual({ key: "a", before: true });
    expect(gapToSibling({ end: "a" })).toEqual({ key: "a", before: false });
});
