import * as R from "remeda";
import type { Attachment } from "svelte/attachments";

type DropData = Record<string, JSONValue>;

interface DropTargetOptions {
    /** Handle an accepted drop */
    onDrop: (data: DropData, event: DragEvent) => unknown;
    /**
     * Whether to handle a drop. Rejected drops continue on to any outer drop target.
     * Only runs on drop: drag data can't be read while hovering, so the highlight shows regardless.
     */
    accept?: (data: DropData) => boolean;
    /** Leave drags and drops to outer drop targets */
    disabled?: boolean;
}

/**
 * Create an attachment that makes an element a drop target. The element has `data-drop-hover` while a drag is over it
 * and not over a nested drop target. Core already cancels `dragover` document-wide, so drops need no handler for it.
 *
 * Used over core `DragDrop` inside Svelte content. `DragDrop` only binds elements that exist when `bind()` runs in
 * `_onRender`, anything Svelte mounts later is missed and has no nesting handling. Unaccepted drops still
 * propagate to a `DragDrop` bound on the application root.
 */
function dropTarget({ onDrop, accept, disabled = false }: DropTargetOptions): Attachment<HTMLElement> {
    return (element) => {
        if (disabled) return;

        // Nested drop targets stop their enter, so only a count turns this off while over one
        let depth = 0;
        const setHover = (hover: boolean) => element.toggleAttribute("data-drop-hover", hover);

        const onDragEnter = (event: DragEvent): void => {
            event.stopPropagation();
            depth += 1;
            setHover(true);
        };
        const onDragLeave = (event: DragEvent): void => {
            event.stopPropagation();
            // Browsers may leave relatedTarget empty. Leaving the element entirely also resets a count thrown off by a
            // child removed mid-drag.
            const entered = event.relatedTarget ?? element.ownerDocument.elementFromPoint(event.clientX, event.clientY);
            depth = element.contains(entered as Node | null) ? Math.max(depth - 1, 0) : 0;
            setHover(depth > 0);
        };
        const onDropEvent = (event: DragEvent): void => {
            depth = 0;
            setHover(false);
            const parsed = fa.ux.TextEditor.implementation.getDragEventData(event);
            const data: DropData = R.isPlainObject(parsed) ? parsed : {};
            if (accept && !accept(data)) return;
            event.preventDefault();
            event.stopPropagation();
            onDrop(data, event);
        };

        element.addEventListener("dragenter", onDragEnter);
        element.addEventListener("dragleave", onDragLeave);
        element.addEventListener("drop", onDropEvent);
        return () => {
            element.removeEventListener("dragenter", onDragEnter);
            element.removeEventListener("dragleave", onDragLeave);
            element.removeEventListener("drop", onDropEvent);
            element.removeAttribute("data-drop-hover");
        };
    };
}

export { dropTarget };
export type { DropData, DropTargetOptions };
