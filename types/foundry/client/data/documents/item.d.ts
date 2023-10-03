import type { ClientBaseItem } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Item document which extends the common BaseItem abstraction.
     * Each Item document contains ItemData which defines its data schema.
     * @see {@link data.ItemData}              The Item data schema
     * @see {@link documents.Items}            The world-level collection of Item documents
     * @see {@link applications.ItemSheet}     The Item configuration application
     */
    class Item<TParent extends Actor<TokenDocument<Scene | null> | null> | null> extends ClientBaseItem<TParent> {
        /** A convenience alias of Item#parent which is more semantically intuitive */
        get actor(): TParent;

        img: ImageFilePath;

        /** A convenience alias of Item#isEmbedded which is preserves legacy support */
        get isOwned(): boolean;

        /**
         * Return an array of the Active Effect instances which originated from this Item.
         * The returned instances are the ActiveEffect instances which exist on the Item itself.
         */
        get transferredEffects(): CollectionValue<this["effects"]>[];

        /** A convenience reference to the item type (data.type) of this Item */
        get type(): string;

        /** Prepare a data object which defines the data schema used by dice roll commands against this Item */
        getRollData(): object;

        protected override _getSheetClass(): ConstructorOf<NonNullable<this["_sheet"]>>;

        protected static override _onCreateDocuments<TDocument extends foundry.abstract.Document>(
            this: ConstructorOf<TDocument>,
            items: TDocument[],
            context: DocumentModificationContext<TDocument["parent"]>
        ): void;

        protected static override _onDeleteDocuments<TDocument extends foundry.abstract.Document>(
            this: ConstructorOf<TDocument>,
            items: TDocument[],
            context: DocumentModificationContext<TDocument["parent"]>
        ): void;
    }

    interface Item<TParent extends Actor<TokenDocument<Scene | null> | null> | null> extends ClientBaseItem<TParent> {
        get uuid(): ItemUUID;

        _sheet: ItemSheet<this> | null;

        get sheet(): ItemSheet<this>;
    }

    type EmbeddedItemUUID = `Actor.${string}.Item.${string}`;
    type WorldItemUUID = WorldDocumentUUID<Item<null>>;
    type CompendiumItemUUID = `Compendium.${string}.Item.${string}`;
    type ItemUUID = WorldItemUUID | EmbeddedItemUUID | CompendiumItemUUID;
}
