import { DatabaseCreateOperation, DatabaseDeleteOperation } from "@common/abstract/_types.mjs";
import Document from "@common/abstract/document.mjs";
import { DocumentSheetV1Options } from "../appv1/api/document-sheet-v1.mjs";
import ItemSheet from "../appv1/sheets/item-sheet.mjs";
import { Actor, BaseItem, ItemUUID, User } from "./_module.mjs";
import { ClientDocument, ClientDocumentStatic } from "./abstract/client-document.mjs";

interface ClientBaseItemStatic extends Omit<typeof BaseItem, "new">, ClientDocumentStatic {}

declare const ClientBaseItem: {
    new <TParent extends Actor | null>(...args: any): BaseItem<TParent> & ClientDocument<TParent>;
} & ClientBaseItemStatic;

declare interface ClientBaseItem<TParent extends Actor | null> extends InstanceType<typeof ClientBaseItem<TParent>> {}

/**
 * The client-side Item document which extends the common BaseItem model.
 *
 * @see {@link foundry.documents.collections.Items} The world-level collection of Item documents
 * @see {@link foundry.applications.sheets.ItemSheetV2} The Item configuration application
 */
export default class Item<TParent extends Actor | null = Actor | null> extends ClientBaseItem<TParent> {
    /** A convenience alias of Item#parent which is more semantically intuitive */
    get actor(): TParent;

    /** Provide a thumbnail image path used to represent this document. */
    get thumbnail(): this["img"];

    /** A convenience alias of Item#isEmbedded which is preserves legacy support */
    get isOwned(): boolean;

    /**
     * Return an array of the Active Effect instances which originated from this Item.
     * The returned instances are the ActiveEffect instances which exist on the Item itself.
     */
    get transferredEffects(): CollectionValue<this["effects"]>[];

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    /** Prepare a data object which defines the data schema used by dice roll commands against this Item */
    getRollData(): object;

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override _preCreate(
        data: this["_source"],
        options: DatabaseCreateOperation<TParent>,
        user: User,
    ): Promise<boolean | void>;

    protected static override _onCreateOperation<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        items: TDocument[],
        context: DatabaseCreateOperation<TDocument["parent"]>,
    ): Promise<void>;

    protected static override _onDeleteOperation(
        documents: Document[],
        operation: DatabaseDeleteOperation<Document | null>,
        user: User,
    ): Promise<void>;
}

export default interface Item<TParent extends Actor | null = Actor | null> extends ClientBaseItem<TParent> {
    get uuid(): ItemUUID;
    get sheet(): ItemSheet<this, DocumentSheetV1Options>;
}

export {};
