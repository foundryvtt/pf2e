import { GapIndex, gapsEqual, type GapNode } from "@module/sheet/components/list/drop-gaps.ts";

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

describe("GapIndex", () => {
    test("after a row is before its next sibling", () => {
        expect(index.after("sword")).toEqual({ before: "bow" });
        expect(index.after("rope")).toEqual({ before: "sack" });
    });

    test("after the last top-level row is the end of its list", () => {
        expect(index.after("bow")).toEqual({ end: "bow" });
        expect(index.after("box")).toEqual({ end: "box" });
    });

    test("after a container's last content is the end of its contents", () => {
        expect(index.after("chalk")).toEqual({ end: "chalk" });
        expect(index.after("sack")).toEqual({ end: "sack" });
        expect(index.after("pack")).toEqual({ before: "chest" });
    });

    test("the end of a top-level list", () => {
        expect(index.endOf("containers")).toEqual({ end: "box" });
        expect(new GapIndex([{ id: "empty", nodes: [] }]).endOf("empty")).toBeNull();
    });

    test("parents, lists and containment", () => {
        expect(index.parentOf("chalk")).toBe("sack");
        expect(index.parentOf("pack")).toBeNull();
        expect(index.listOf("chalk")).toBe("containers");
        expect(index.contains("pack", "chalk")).toBe(true);
        expect(index.contains("sack", "rope")).toBe(false);
        expect(index.childrenOf("chest")).toEqual([]);
        expect(index.childrenOf("box")).toBeNull();
    });

    test("only top-level gaps belong to a section", () => {
        expect(index.topLevelListOf({ before: "bow" })).toBe("weapons");
        expect(index.topLevelListOf({ end: "box" })).toBe("containers");
        expect(index.topLevelListOf({ before: "rope" })).toBeNull();
        expect(index.containerOf({ before: "chalk" })).toBe("sack");
        expect(index.containerOf({ end: "chalk" })).toBe("sack");
        expect(index.topLevelListOf({ end: "chalk" })).toBeNull();
    });

    test("gap equality", () => {
        expect(gapsEqual({ before: "a" }, { before: "a" })).toBe(true);
        expect(gapsEqual({ before: "a" }, { end: "a" })).toBe(false);
        expect(gapsEqual({ end: "a" }, { end: "a" })).toBe(true);
    });
});
