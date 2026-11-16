import { getActiveDrag, watchDragSource, type ActiveDrag } from "@module/sheet/drag-source.ts";
import { markDropHandled } from "@module/sheet/drop-target.ts";
import { getContext, setContext } from "svelte";
import type { Attachment } from "svelte/attachments";
import { GapIndex, type GapList } from "./drop-gaps.ts";
import { isNoopHit, resolveRowHit, sameBoundary, type ListHit } from "./drop-hit.ts";

/** How a row shows a pending drop: a gap opened above it, a gap under its whole block, or an outline */
type DropMarker = "before" | "end" | "into" | null;

/** What a list tells its drop controller. Read on every use, so it may return fresh values. */
interface ListDropSource {
    /** The lists as displayed (filtered and sorted), with open containers' contents as children */
    lists: GapList[];
    /** False while the view hides rows' true neighbors (sorted, searched): no gaps */
    reorderable: boolean;
    /** Matches the rows' `li` elements, which carry their key as `data-uuid` */
    rowSelector: string;
    isContainer?: (key: string) => boolean;
    /** Whether the dragged row can stack onto this one */
    stackable?: (key: string, drag: ActiveDrag) => boolean;
    /** Where a drag over a row would land when the list isn't reorderable. Without it, nowhere. */
    unordered?: (key: string, index: GapIndex) => ListHit | null;
    /** Where a drag off the rows would land (headers, the space between lists). Without it, nowhere. */
    outside?: (element: Element, y: number, index: GapIndex) => ListHit | null;
    /** Refuse a landing place, beyond the no-ops already hidden (onto or beside the dragged row) */
    allows?: (hit: ListHit, drag: ActiveDrag | null, index: GapIndex) => boolean;
    /** Without a handler the list takes no drops */
    onDrop?: (event: DragEvent, hit: ListHit, index: GapIndex) => void;
}

const CONTEXT_KEY = "pf2e:list-drop";

/**
 * A list's drop state: one target for the whole list, found from the pointer on each dragover. Every gap between
 * rows has one name and one place (see `GapIndex`), opened by the row that owns it (`ListRow` reads `markerFor`).
 * A drag with no target here is left alone, so its drop reaches whatever drop target is outside the list.
 */
class ListDrop {
    hit = $state<ListHit | null>(null);

    #source: () => ListDropSource;
    /** The last dragover position, for finding the target again after a scroll */
    #pointer: { x: number; y: number } | null = null;
    #stackable = new Map<string, boolean>();
    #dropped: ActiveDrag | null = null;

    #index = $derived.by(() => new GapIndex(this.#source().lists));

    constructor(source: () => ListDropSource) {
        this.#source = source;
    }

    /** The row being dragged, for a drop handler that needs it without parsing the drag data */
    get dragged(): ActiveDrag | null {
        return this.#dropped;
    }

    markerFor(key: string): DropMarker {
        const hit = this.hit;
        if (!hit || hit.kind === "zone" || hit.kind === "list") return null;
        if (hit.kind !== "gap") return hit.key === key ? "into" : null;
        return "before" in hit.gap ? (hit.gap.before === key ? "before" : null) : hit.gap.end === key ? "end" : null;
    }

    /** Listens on an element holding the whole list: rows, contents and summaries all resolve through here */
    zone: Attachment<HTMLElement> = (element) => {
        // The rows ease their gaps open and shut. A change of level at one boundary moves the gap from one li to
        // another in the same place, which should swap, not ease: the attribute is set before the rows see the change.
        const setHit = (hit: ListHit | null): void => {
            element.toggleAttribute("data-drop-snap", sameBoundary(this.#index, this.hit, hit));
            this.hit = hit;
        };
        const reset = (): void => {
            setHit(null);
            this.#pointer = null;
            this.#stackable.clear();
        };
        // Rows move under a still pointer while scrolling. Scroll events don't bubble, so this listens in capture.
        const onScroll = (): void => {
            const pointer = this.#pointer;
            if (!pointer) return;
            const under = element.ownerDocument.elementFromPoint(pointer.x, pointer.y);
            setHit(this.#resolve(under, pointer.x, pointer.y));
        };
        // The window's listeners follow the element: detaching a sheet moves it to another window without a re-render
        let bound: Document | null = null;
        const unbind = (): void => {
            bound?.removeEventListener("scroll", onScroll, { capture: true });
            bound?.defaultView?.removeEventListener("dragend", reset, { capture: true });
            bound = null;
        };
        const bind = (): void => {
            const doc = element.ownerDocument;
            if (bound === doc) return;
            unbind();
            bound = doc;
            doc.addEventListener("scroll", onScroll, { capture: true, passive: true });
            doc.defaultView?.addEventListener("dragend", reset, { capture: true });
            if (doc.defaultView) watchDragSource(doc.defaultView);
        };
        const onDragOver = (event: DragEvent): void => {
            bind();
            this.#pointer = { x: event.clientX, y: event.clientY };
            setHit(this.#resolve(event.target, event.clientX, event.clientY));
        };
        const onDragLeave = (event: DragEvent): void => {
            const entered = event.relatedTarget ?? element.ownerDocument.elementFromPoint(event.clientX, event.clientY);
            if (!(entered && fu.isElementInstanceOf(entered, Node) && element.contains(entered))) reset();
        };
        // Found again from the drop's own position, since the last dragover may predate a scroll
        const onDrop = (event: DragEvent): void => {
            const hit = this.#resolve(event.target, event.clientX, event.clientY);
            reset();
            const onDrop = this.#source().onDrop;
            if (!hit || !onDrop) return;
            // Marked as handled, not stopped: an AppV1 sheet the row came from needs to see where it was dropped
            event.preventDefault();
            markDropHandled(event);
            this.#dropped = getActiveDrag();
            onDrop(event, hit, this.#index);
            this.#dropped = null;
        };

        bind();
        element.addEventListener("dragover", onDragOver);
        element.addEventListener("dragleave", onDragLeave);
        element.addEventListener("drop", onDrop);
        return () => {
            element.removeEventListener("dragover", onDragOver);
            element.removeEventListener("dragleave", onDragLeave);
            element.removeEventListener("drop", onDrop);
            unbind();
            reset();
        };
    };

    #resolve(start: EventTarget | null, x: number, y: number): ListHit | null {
        const source = this.#source();
        if (!source.onDrop) return null;
        const index = this.#index;
        const element = start && fu.isElementInstanceOf(start, Element) ? start : null;
        const li = element?.closest<HTMLElement>(source.rowSelector) ?? null;
        if (!li) return this.#valid(element ? (source.outside?.(element, y, index) ?? null) : null);
        const key = li.dataset.uuid;
        if (!key || !index.has(key)) return null;
        if (!source.reorderable) return this.#valid(source.unordered?.(key, index) ?? null);

        const row = li.querySelector(":scope > .row")?.getBoundingClientRect();
        if (!row) return null;
        const block = li.getBoundingClientRect();
        const contents = li.querySelector(":scope > ul.contents")?.getBoundingClientRect() ?? null;
        // One nesting level's width: the rows' `--list-row-indent`, in rem or px
        const view = li.ownerDocument.defaultView;
        const rem = parseFloat(view?.getComputedStyle(li.ownerDocument.documentElement).fontSize ?? "") || 16;
        const indentValue = view?.getComputedStyle(li).getPropertyValue("--list-row-indent").trim() ?? "";
        const indent = (parseFloat(indentValue) || 1) * (indentValue.endsWith("px") ? 1 : rem);
        const container = !!source.isContainer?.(key);
        const hit = resolveRowHit(
            index,
            key,
            {
                row: { top: row.top, bottom: row.bottom },
                blockBottom: block.bottom,
                contents: contents && { top: contents.top, bottom: contents.bottom },
                left: block.left,
                indent,
            },
            { x, y },
            { container, stackable: !container && this.#canStackOnto(key) },
        );
        return this.#valid(hit);
    }

    #valid(hit: ListHit | null): ListHit | null {
        if (!hit) return null;
        const drag = getActiveDrag();
        const index = this.#index;
        if (isNoopHit(index, hit, drag)) return null;
        const allows = this.#source().allows;
        return !allows || allows(hit, drag, index) ? hit : null;
    }

    /** Only this list's own rows stack, and only onto a row that will take them */
    #canStackOnto(key: string): boolean {
        const drag = getActiveDrag();
        const stackable = this.#source().stackable;
        if (!stackable || !drag || drag.key === key || !this.#index.has(drag.key)) return false;
        const cached = this.#stackable.get(key);
        if (cached !== undefined) return cached;
        const result = stackable(key, drag);
        this.#stackable.set(key, result);
        return result;
    }
}

function provideListDrop(drop: ListDrop): void {
    setContext(CONTEXT_KEY, drop);
}

function useListDrop(): ListDrop | null {
    return getContext<ListDrop | undefined>(CONTEXT_KEY) ?? null;
}

export { ListDrop, provideListDrop, useListDrop };
export type { DropMarker, ListDropSource };
