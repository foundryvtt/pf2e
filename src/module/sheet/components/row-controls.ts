/** A button in a list row's controls column */
interface RowControl {
    icon: string;
    /** Localization key for the tooltip and, with the row's name, the accessible name */
    label: string;
    /** Toggle state, for buttons that switch something on and off */
    pressed?: boolean;
    /** `trigger` is the element that ran it: the row button, or the row menu's item */
    onClick: (event: MouseEvent, trigger: HTMLElement) => unknown;
}

/** The small icon button used in list rows and beside compact headings */
const SMALL_CONTROL_SIZE = "var(--spacer-20)";

/** CSS width of a controls column holding at most `count` buttons, so lists size it without measuring */
function rowControlsWidth(count: number): string {
    return count > 0 ? `calc(${count} * ${SMALL_CONTROL_SIZE} + ${count - 1} * var(--space-2))` : "0px";
}

export { SMALL_CONTROL_SIZE, rowControlsWidth };
export type { RowControl };
