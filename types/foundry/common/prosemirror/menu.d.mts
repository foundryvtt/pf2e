import Document from "@common/abstract/document.mjs";
import { MarkType, NodeType, Schema } from "prosemirror-model";
import { Command, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { ProseMirrorDropDownConfig, ProseMirrorMenuItem, ProseMirrorMenuOptions } from "./_types.mjs";
import ProseMirrorDropDown from "./dropdown.mjs";
import ProseMirrorPlugin from "./plugin.mjs";

/**
 * A class responsible for building a menu for a ProseMirror instance.
 */
export default class ProseMirrorMenu extends ProseMirrorPlugin {
    /**
     * @param schema The ProseMirror schema to build a menu for.
     * @param view The editor view.
     * @param options Additional options to configure the plugin's behaviour.
     */
    constructor(schema: Schema, view: EditorView, options?: ProseMirrorMenuOptions);

    /** The editor view. */
    view: EditorView;

    /** The items configured for this menu. */
    items: ProseMirrorMenuItem[];

    /** The ID of the menu element in the DOM */
    id: string;

    /**
     * The dropdowns configured for this menu.
     */
    dropdowns: ProseMirrorDropDown[];

    /** An enumeration of editor scopes in which a menu item can appear */
    protected static _MENU_ITEM_SCOPES: {
        BOTH: "";
        TEXT: "text";
        HTML: "html";
    };

    /** Additional options to configure the plugin's behaviour. */
    options: ProseMirrorMenuOptions;

    /**
     * Track whether we are currently in a state of editing the HTML source.
     */
    get editingSource(): boolean;

    static override build(schema: Schema, options?: object): Plugin;

    /** Render the menu's HTML. */
    render(): this;

    /** Attach event listeners. */
    activateListeners(html: HTMLElement): void;

    /**
     * Called whenever the view's state is updated.
     * @param view       The current editor state.
     * @param prevState  The previous editor state.
     */
    update(view: EditorView, prevState: EditorView): void;

    /** Called when the view is destroyed or receives a state with different plugins. */
    destroy(): void;

    /** Instantiate the ProseMirrorDropDown instances and configure them with the defined menu items. */
    protected _createDropDowns(): void;

    /** Configure dropdowns for this menu. Each entry in the top-level array corresponds to a separate drop-down. */
    protected _getDropDownMenus(): Record<string, ProseMirrorDropDownConfig>;

    /** Configure the items for this menu. */
    protected _getMenuItems(): ProseMirrorMenuItem[];

    /**
     * Determine whether the given menu item is currently active or not.
     * @param item The menu item.
     * @returns Whether the cursor or selection is in a state represented by the given menu item.
     */
    protected _isItemActive(item: ProseMirrorMenuItem): boolean;

    /**
     * Determine whether the given menu item representing a mark is active or not.
     * @param item The menu item representing a {@link MarkType}.
     * @returns Whether the cursor or selection is in a state represented by the given mark.
     */
    _isMarkActive(item: ProseMirrorMenuItem): boolean;

    /**
     * Determine whether the given menu item representing a node is active or not.
     * @param item The menu item representing a {@link NodeType}.
     * @returns Whether the cursor or selection is currently within a block of this menu item's node type.
     */
    _isNodeActive(item: ProseMirrorMenuItem): boolean;

    /**
     * Handle a button press.
     * @param  event  The click event.
     */
    protected _onAction(event: PointerEvent): void;

    protected _onResize(entries: ResizeObserverEntry[]): void;

    /** Wrap the editor view element and inject our template ready to be rendered into. */
    protected _wrapEditor(): void;

    /** Handle requests to save the editor contents */
    protected _handleSave(): void;

    /**
     * Global listeners for the drop-down menu.
     * @param document The document to bind to.
     */
    static activateListeners(document: Document, options?: object): void;

    /* -------------------------------------------- */
    /*  Editor Functions                            */
    /* -------------------------------------------- */

    /**
     * Clear a specific mark from the selection.
     * @param markType The mark to remove.
     */
    protected _clearMark(markType: MarkType): void;

    /**
     * Display the insert link prompt.
     */
    protected _insertLinkPrompt(): Promise<void>;

    /**
     * Display a prompt for font color.
     */
    protected _fontColorPrompt(): Promise<void>;

    /**
     * Display a prompt for a custom font size.
     */
    protected _fontSizePrompt(): Promise<void>;

    /**
     * Display the insert image prompt.
     */
    protected _insertImagePrompt(): Promise<void>;

    /**
     * Display the insert link prompt.
     */
    protected _insertLinkProtect(): Promise<void>;

    /**
     * Display the insert table prompt.
     */
    protected _insertTablePrompt(): Promise<void>;

    /**
     * Create a dialog for a menu button.
     * @param action The unique menu button action.
     * @param template The dialog's template.
     * @param options Additional options to configure the dialog's behaviour.
     * @param options.data Data to pass to the template.
     */
    protected _showDialog(
        action: string,
        template: string,
        options?: { data?: Record<string, unknown> },
    ): Promise<HTMLElement>;

    /**
     * Clear any marks from the current selection.
     */
    protected _clearFormatting(): void;

    /**
     * Toggle link recommendations
     */
    protected _toggleMatches(): Promise<void>;

    /**
     * Toggle the given selection by wrapping it in a given block or lifting it out of one.
     * @param node The type of node being interacted with.
     * @param wrap The wrap command specific to the given node.
     * @param options Additional options to configure behaviour.
     * @param options.attrs Attributes for the node.
     */
    _toggleBlock(
        node: NodeType,
        wrap: (node: NodeType, attrs?: object | null) => Command,
        options?: { attrs?: Record<string, unknown> | null },
    ): void;

    /**
     * Toggle the given selection by wrapping it in a given text block, or reverting to a paragraph block.
     * @param node The type of node being interacted with.
     * @param options Additional options to configure behaviour.
     * @param options.attrs Attributes for the node.
     */
    _toggleTextBlock(node: NodeType, options?: { attrs?: Record<string, unknown> | null }): void;
}
