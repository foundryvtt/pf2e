/** A row in display order. `children` are an open container's contents, null for anything else. */
interface GapNode {
    key: string;
    children: GapNode[] | null;
}

/** A top-level list (e.g. a section) and its rows in display order */
interface GapList {
    id: string;
    nodes: GapNode[];
}

/**
 * One insertion point: `before` a row, or the `end` of the list or container that row closes.
 * Under a container's last row, that row's lower half is the end of the contents and the next outer row's
 * upper half is the gap after the container.
 */
type Gap = { before: string } | { end: string };

/** Sibling and parent lookups over displayed rows, for naming insertion points */
class GapIndex {
    #siblings = new Map<string, string[]>();
    #parent = new Map<string, string | null>();
    #list = new Map<string, string>();
    #children = new Map<string, string[]>();
    #lastTopLevel = new Map<string, string>();

    constructor(lists: GapList[]) {
        const visit = (nodes: GapNode[], parent: string | null, listId: string): void => {
            const keys = nodes.map((n) => n.key);
            for (const node of nodes) {
                this.#siblings.set(node.key, keys);
                this.#parent.set(node.key, parent);
                this.#list.set(node.key, listId);
                if (node.children) {
                    this.#children.set(
                        node.key,
                        node.children.map((c) => c.key),
                    );
                    visit(node.children, node.key, listId);
                }
            }
        };
        for (const list of lists) {
            visit(list.nodes, null, list.id);
            const last = list.nodes.at(-1);
            if (last) this.#lastTopLevel.set(list.id, last.key);
        }
    }

    has(key: string): boolean {
        return this.#parent.has(key);
    }

    /** The open container holding a row, null at the top level */
    parentOf(key: string): string | null {
        return this.#parent.get(key) ?? null;
    }

    /** The top-level list a row is in, at any depth */
    listOf(key: string): string | null {
        return this.#list.get(key) ?? null;
    }

    /** An open container's displayed contents, null when the row isn't one */
    childrenOf(key: string): string[] | null {
        return this.#children.get(key) ?? null;
    }

    /** Whether `key` is inside `ancestor`'s open contents, at any depth */
    contains(ancestor: string, key: string): boolean {
        for (let parent = this.parentOf(key); parent; parent = this.parentOf(parent)) {
            if (parent === ancestor) return true;
        }
        return false;
    }

    before(key: string): Gap {
        return { before: key };
    }

    /** The gap after a row's whole block: before its next sibling, or the end of its list */
    after(key: string): Gap {
        const siblings = this.#siblings.get(key) ?? [];
        const next = siblings[siblings.indexOf(key) + 1];
        return next ? { before: next } : { end: key };
    }

    /** The end of a top-level list, null when it has no rows */
    endOf(listId: string): Gap | null {
        const last = this.#lastTopLevel.get(listId);
        return last ? { end: last } : null;
    }

    /** The open container a gap is in (null at the top level) */
    containerOf(gap: Gap): string | null {
        return this.parentOf("before" in gap ? gap.before : gap.end);
    }

    /** The top-level list a gap is in when it sits at the top level, else null */
    topLevelListOf(gap: Gap): string | null {
        const key = "before" in gap ? gap.before : gap.end;
        return this.parentOf(key) === null ? this.listOf(key) : null;
    }
}

function gapsEqual(a: Gap, b: Gap): boolean {
    return "before" in a ? "before" in b && a.before === b.before : "end" in b && a.end === b.end;
}

export { GapIndex, gapsEqual };
export type { Gap, GapList, GapNode };
