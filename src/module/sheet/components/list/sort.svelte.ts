type SortDirection = "ascending" | "descending";

interface SortState<TColumn extends string> {
    column: TColumn;
    direction: SortDirection;
}

/**
 * A view-only column sort, cycled per column: ascending, descending, then back to the manual (document) order.
 * It never writes documents. Lists suspend reorder drops while it's active.
 */
class ListSort<TColumn extends string> {
    state = $state<SortState<TColumn> | null>(null);

    get active(): boolean {
        return this.state !== null;
    }

    cycle(column: TColumn): void {
        const current = this.state;
        this.state =
            current?.column !== column
                ? { column, direction: "ascending" }
                : current.direction === "ascending"
                  ? { column, direction: "descending" }
                  : null;
    }

    /** The direction for a column, or null if the list isn't sorted by it */
    directionOf(column: TColumn): SortDirection | null {
        return this.state?.column === column ? this.state.direction : null;
    }
}

let collator: Intl.Collator | null = null;

/**
 * Compare two sort values. Missing values (null or empty) sort last in either direction, numbers compare
 * numerically, and text uses numeric collation so "30 feet" sorts before "120 feet".
 */
function compareSortValues(a: string | number | null, b: string | number | null, direction: SortDirection): number {
    const missing = (v: string | number | null): boolean => v === null || v === "";
    if (missing(a) || missing(b)) return Number(missing(a)) - Number(missing(b));
    const sign = direction === "ascending" ? 1 : -1;
    if (typeof a === "number" && typeof b === "number") return sign * (a - b);
    collator ??= new Intl.Collator(game.i18n.lang, { numeric: true, sensitivity: "base" });
    return sign * collator.compare(String(a), String(b));
}

export { compareSortValues, ListSort };
export type { SortDirection, SortState };
