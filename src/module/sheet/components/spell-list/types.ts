import type { ImageFilePath } from "@common/constants.mjs";
import type { ItemUUID } from "@common/documents/_module.mjs";
import type { ZeroToTen } from "@module/data.ts";

/** A middle column a spell list can display. Widths: defense 6rem, range 4rem, uses 4rem. */
type SpellListColumn = "defense" | "range" | "uses";

/** A sortable row value: the name cell, one of the middle columns, or the prepared count (via the
 *  group header's usage indicator) */
type SpellListSortColumn = "name" | "prepared" | SpellListColumn;

/** A view-only sort applied within each group, cycled by clicking column headers */
interface SpellListSortState {
    column: SpellListSortColumn;
    direction: "ascending" | "descending";
}

interface SpellRowData {
    id: string;
    uuid: ItemUUID;
    img: ImageFilePath;
    name: string;
    /** When the spell was last modified, keeping its expanded summary fresh */
    updatedAt?: number;
    /** Action glyph text for the cast time ("" when not renderable as a glyph) */
    glyph: string;
    defense: string | null;
    range: string | null;
    isCantrip: boolean;
    /** Whether this spell is in a flexible collection (or is a signature spell, in later sheet contexts) */
    signature: boolean;
    /** Disable the signature checkbox (e.g. a flexible collection at capacity) */
    signatureDisabled?: boolean;
    /**
     * Slot-preparation state: present only when this spell prepares into slots (all spells of a prepared entry,
     * only the cantrips of a flexible one). Gates the row's prepare button and prepared-count badge.
     */
    slots?: {
        /** Slot groups with a free slot this spell may be prepared into */
        prepareTargets: { rank: ZeroToTen; label: string }[];
        /** Slot groups currently holding this spell (and how many times), from which a preparation can be removed */
        unprepareTargets: { rank: ZeroToTen; label: string; count: number }[];
        /** Number of slots currently holding this spell (badge hidden when zero) */
        preparedCount: number;
    };
}

interface SpellListGroupData {
    rank: ZeroToTen;
    label: string;
    spells: SpellRowData[];
    /** Filled/total slots for this group, shown in the group header when provided */
    usage?: { value: number; max: number } | null;
}

/**
 * Document mutations and app interactions, provided by the owning application. Optional members hide their UI.
 *
 * TODO (sheet migration): sheet-side spell-list features are not yet supported: cast buttons, slot rows and
 * expend toggles, uses inputs (the "uses" column renders empty), focus pips, and the spontaneous caster's
 * signature-spell star, which likely warrants a separate action from the flexible-membership checkbox despite
 * both writing `system.location.signature`.
 */
interface SpellListActions {
    sendToChat: (id: string, event: MouseEvent) => void;
    edit?: (id: string) => void;
    /** May return a promise: the row awaits it before moving focus to a neighboring row */
    delete?: (id: string) => void | Promise<unknown>;
    /**
     * Toggle membership in a flexible spell collection (renders a checkbox on non-cantrip rows when provided).
     * TODO: rename to reflect flexible-collection membership if/when a star-rendering signature toggle is added
     * for spontaneous sheet lists.
     */
    toggleSignature?: (id: string) => void;
    /** Prepare a spell into the first free slot of a group (renders a button on rows with prepareTargets) */
    prepare?: (id: string, rank: ZeroToTen) => void;
    /** Remove a preparation of a spell from a group (right-click on the row's prepare button) */
    unprepare?: (id: string, rank: ZeroToTen) => void;
    /** Create a new spell in the group (renders a + button in group headers when provided) */
    create?: (rank: ZeroToTen) => void;
    /** Open the compendium browser for the group (renders a search button in group headers when provided) */
    browse?: (rank: ZeroToTen) => void;
    /** Handle a spell drop onto a row (with the insertion side) or the list root (null). Rows become drop targets when provided. */
    handleDrop?: (event: DragEvent, target: { id: string; before: boolean } | null) => void;
}

export type {
    SpellListActions,
    SpellListColumn,
    SpellListGroupData,
    SpellListSortColumn,
    SpellListSortState,
    SpellRowData,
};
