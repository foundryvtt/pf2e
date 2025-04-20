import type Document from "../../../common/abstract/document.d.ts";
import type { ApplicationConfiguration } from "../_types.d.ts";
import type { ApplicationV2, HandlebarsApplicationMixin, HandlebarsTemplatePart } from "../api/module.d.ts";

interface HotbarSlotData {
    slot: number;
    macro: Macro | null;
    key: number;
    tooltip: string;
    ariaLabel: string;
    style: string;
}

/**
 * An action bar displayed at the bottom of the game view which contains Macros as interactive buttons.
 * The Hotbar supports 5 pages of macros which can be dragged and dropped to organize as you wish.
 * Left-clicking a Macro button triggers its effect.
 * Right-clicking the button displays a context menu of Macro options.
 * The number keys 1 through 0 activate numbered hotbar slots.
 * @alias Hotbar
 */
export default class Hotbar<TMacro extends Macro> extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: ApplicationConfiguration;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /** The current hotbar page number. */
    get page(): number;

    /** The currently rendered macro data. */
    get slots(): HotbarSlotData[];

    /** Whether the hotbar is locked. */
    get locked(): boolean;

    protected override _prepareContext(options: object): Promise<object>;

    protected override _onFirstRender(): void;

    protected override _onRender(): Promise<void>;

    /**
     * Get the set of ContextMenu options which should be applied for Scenes in the menu.
     * @returns The Array of context options passed to the ContextMenu instance
     */
    protected _getContextMenuOptions(): ContextMenuEntry[];

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Change to a specific numbered page from 1 to 5
     * @param page The page number to change to
     */
    changePage(page: number): Promise<void>;

    /**
     * Change the page of the hotbar by cycling up (positive) or down (negative).
     * @param The direction to cycle
     */
    cyclePage(direction: number): Promise<void>;

    /**
     * A reusable helper that can be used for toggling display of a document sheet.
     * @param uuid The Document UUID to display
     */
    static toggleDocumentSheet(uuid: DocumentUUID): Promise<void>;

    /**
     * Create a Macro which rolls a RollTable when executed
     * @param table The RollTable document
     * @returns A created Macro document to add to the bar
     */
    protected _createRollTableRollMacro(table: RollTable): Promise<TMacro | undefined>;

    /**
     * Create a Macro document which can be used to toggle display of a Journal Entry.
     * @param doc A Document which should be toggled
     * @returns A created Macro document to add to the bar
     */
    protected _createDocumentSheetToggle(doc: Document): Promise<TMacro | undefined>;
}
