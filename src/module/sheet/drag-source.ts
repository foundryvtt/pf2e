/** A row being dragged from a sheet list */
interface ActiveDrag {
    key: string;
    type: string;
}

let active: ActiveDrag | null = null;
const watched = new WeakSet<Window>();

/**
 * Browsers hide drag data until drop, so lists read the current drag from here to hide drops that would do nothing.
 * Null for drags that started elsewhere.
 */
function getActiveDrag(): ActiveDrag | null {
    return active;
}

function setActiveDrag(drag: ActiveDrag | null, win: Window = window): void {
    watchDragSource(win);
    active = drag;
}

/** Clears the active drag on dragend, and on dragstart since a row removed mid-drag never fires dragend */
function watchDragSource(win: Window): void {
    if (watched.has(win)) return;
    watched.add(win);
    const clear = (): void => {
        active = null;
    };
    win.addEventListener("dragstart", clear, { capture: true });
    win.addEventListener("dragend", clear, { capture: true });
}

export { getActiveDrag, setActiveDrag, watchDragSource };
export type { ActiveDrag };
