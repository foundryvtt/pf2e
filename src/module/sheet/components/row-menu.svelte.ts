import type { Attachment } from "svelte/attachments";
import type { RowControl } from "./row-controls.ts";

/** A row menu item. `trigger` is the menu item element, for actions that restore focus. */
interface RowMenuEntry {
    id: string;
    label: string;
    run: (event: MouseEvent, trigger: HTMLElement) => unknown;
}

/**
 * A list row's context menu: right-click the row, or the ContextMenu key / Shift+F10 on its name. Attach `row` to the
 * row element and `name` to its name button, then render `RowMenu` with this state inside the row.
 */
class RowMenuState {
    open = $state(false);
    /** Where a right-click opened the menu. Null when the keyboard opened it, which puts it under the name. */
    position = $state<{ x: number; y: number } | null>(null);
    /** The opening button is still held (contextmenu fires on press on macOS and Linux) */
    focusOnRelease = $state(false);

    /** A right-click always follows a pointerdown, a keyboard open doesn't */
    #lastPointerdown: { x: number; y: number; time: number } | null = null;
    #name: HTMLElement | null = null;

    row: Attachment<HTMLElement> = (row) => {
        // Each row's menu anchors to its own name button
        row.style.setProperty("anchor-scope", "--pf2e-popover-menu");
        const onPointerdown = (event: PointerEvent) => {
            this.#lastPointerdown = { x: event.clientX, y: event.clientY, time: performance.now() };
        };
        const onContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            const pointer = this.#lastPointerdown;
            this.#lastPointerdown = null;
            const recent = pointer && performance.now() - pointer.time < 1000 ? pointer : null;
            this.position = recent ? { x: recent.x, y: recent.y } : null;
            this.focusOnRelease = event.buttons !== 0;
            this.open = true;
        };
        row.addEventListener("pointerdown", onPointerdown);
        row.addEventListener("contextmenu", onContextMenu);
        return () => {
            row.removeEventListener("pointerdown", onPointerdown);
            row.removeEventListener("contextmenu", onContextMenu);
        };
    };

    name: Attachment<HTMLElement> = (name) => {
        this.#name = name;
        $effect(() => {
            name.style.setProperty("anchor-name", this.open ? "--pf2e-popover-menu" : null);
        });
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
            event.preventDefault();
            event.stopPropagation();
            this.position = null;
            this.focusOnRelease = false;
            this.open = true;
        };
        name.addEventListener("keydown", onKeydown);
        return () => {
            name.removeEventListener("keydown", onKeydown);
            this.#name = null;
        };
    };

    close(refocus: boolean): void {
        this.open = false;
        if (refocus) this.#name?.focus();
    }
}

/** A row's control buttons as menu entries, so the menu offers everything the buttons do */
function controlEntries(controls: RowControl[]): RowMenuEntry[] {
    return controls.map((c) => ({ id: c.label, label: _loc(c.label), run: c.onClick }));
}

export { controlEntries, RowMenuState };
export type { RowMenuEntry };
