import ActiveEffect from "@client/documents/active-effect.mjs";
import Actor from "@client/documents/actor.mjs";
import Folder from "@client/documents/folder.mjs";
import Item from "@client/documents/item.mjs";
import Document from "@common/abstract/document.mjs";
import { ApplicationHeaderControlsEntry } from "../_types.mjs";
import DocumentSheetV2, { DocumentSheetConfiguration, DocumentSheetRenderOptions } from "../api/document-sheet.mjs";
import DragDrop from "../ux/drag-drop.mjs";

/** A base class for providing Actor Sheet behavior using ApplicationV2. */
export default abstract class ActorSheetV2<
    TDocument extends Actor,
    TConfig extends DocumentSheetConfiguration<TDocument> = DocumentSheetConfiguration<TDocument>,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions,
> extends DocumentSheetV2<TConfig, TRenderOptions> {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    /** The Actor document managed by this sheet. */
    get actor(): TDocument;

    /** If this sheet manages the ActorDelta of an unlinked Token, reference that Token document. */
    get token(): TDocument["token"];

    /** Return a cached copy of a DragDrop instance, creating one on first access. */
    protected get _dragDrop(): DragDrop;

    protected override _getHeaderControls(): ApplicationHeaderControlsEntry[];

    protected override _onRender(context: object, options: TRenderOptions): Promise<void>;

    /* -------------------------------------------- */
    /*  Drag and Drop                               */
    /* -------------------------------------------- */

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector.
     * @param selector The candidate HTML selector for dragging
     * @returns Can the current user drag this selector?
     */
    protected _canDragStart(selector: string): boolean;

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector.
     * @param selector The candidate HTML selector for the drop target
     * @returns Can the current user drop on this selector?
     */
    protected _canDragDrop(selector: string): boolean;

    /**
     * An event that occurs when a drag workflow begins for a draggable Item or ActiveEffect on the sheet.
     * @param event The initiating drag start event
     */
    protected _onDragStart(event: DragEvent): Promise<void>;

    /** An event that occurs when a drag workflow moves over a drop target. */
    protected _onDragOver(event: DragEvent): void;

    /**
     * An event that occurs when data is dropped into a drop target.
     * @param event The initiating drop event
     */
    protected _onDrop(event: DragEvent): Promise<void>;

    /**
     * Handle a dropped document on the ActorSheet
     * @param event    The initiating drop event
     * @param document The resolved Document class
     * @returns A Document of the same type as the dropped one in case of a successful result, or null in case of
     *          failure or no action being taken
     */
    protected _onDropDocument<T extends Document>(event: DragEvent, document: T): Promise<T | null>;

    /**
     * Handle a dropped Active Effect on the Actor Sheet.
     * The default implementation creates an Active Effect embedded document on the Actor.
     * @param event  The initiating drop event
     * @param effect The dropped ActiveEffect document
     * @returns A Promise resolving to a newly created ActiveEffect, if one was created, or otherwise a nullish value
     */
    protected _onDropActiveEffect(
        event: DragEvent,
        effect: ActiveEffect<Actor | Item | null>,
    ): Promise<ActiveEffect<TDocument> | null | undefined>;

    /**
     * Handle a dropped Actor on the Actor Sheet.
     * @param event The initiating drop event
     * @param actor The dropped Actor document
     * @returns A Promise resolving to an Actor identical or related to the dropped Actor to indicate success, or a
     *          nullish value to indicate failure or no action being taken
     */
    protected _onDropActor(event: DragEvent, actor: Actor): Promise<Actor | null | undefined>;

    /**
     * Handle a dropped Item on the Actor Sheet.
     * @param event The initiating drop event
     * @param item  The dropped Item document
     * @returns A Promise resolving to the dropped Item (if sorting), a newly created Item, or a nullish value in case
     *          of failure or no action being taken
     */
    protected _onDropItem(event: DragEvent, item: Item<Actor | null>): Promise<Item<Actor | null> | null | undefined>;

    /**
     * Handle a dropped Folder on the Actor Sheet.
     * @param event  The initiating drop event
     * @param folder The dropped Folder document
     * @returns A Promise resolving to the dropped Folder indicate success, or a nullish value to indicate failure or
     *          no action being taken
     */
    protected _onDropFolder(event: DragEvent, folder: Folder): Promise<Folder | null | undefined>;

    /**
     * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings.
     * @param event The initiating drop event
     * @param item  The dropped Item document
     */
    protected _onSortItem(event: DragEvent, item: Item<TDocument>): Promise<Item<TDocument>[]> | void;
}
