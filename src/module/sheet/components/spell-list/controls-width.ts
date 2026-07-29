import { getContext, setContext } from "svelte";
import type { Attachment } from "svelte/attachments";
import { SvelteMap } from "svelte/reactivity";

/** A registry of control-cell widths, from which the list sizes the shared controls column */
type ControlsWidths = SvelteMap<symbol, number>;

const CONTEXT_KEY = "pf2e:spell-list-controls-widths";

/** Create the width registry and provide it to descendants (called by the list during init) */
function provideControlsWidths(): ControlsWidths {
    const widths = new SvelteMap<symbol, number>();
    setContext(CONTEXT_KEY, widths);
    return widths;
}

/**
 * Create an attachment that reports an element's border-box width into the list's registry for as
 * long as the element exists. Call during component init: this consumes the list's context.
 */
function reportControlsWidth(): Attachment<HTMLElement> {
    const widths = getContext<ControlsWidths>(CONTEXT_KEY);
    const key = Symbol();
    return (element) => {
        const observer = new ResizeObserver(([entry]) => {
            widths.set(key, entry.borderBoxSize[0].inlineSize);
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
            widths.delete(key);
        };
    };
}

export { provideControlsWidths, reportControlsWidth };
