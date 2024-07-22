import type { ClientBaseItem } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Item document which extends the common BaseItem model.
     *
     * @see {@link documents.Items}            The world-level collection of Item documents
     * @see {@link applications.ItemSheet}     The Item configuration application
     */
    class Item<TParent extends Actor | null = Actor | null> extends ClientBaseItem<TParent> {
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

        protected static override _onCreateOperation<TDocument extends foundry.abstract.Document>(
            this: ConstructorOf<TDocument>,
            items: TDocument[],
            context: DatabaseCreateOperation<TDocument["parent"]>,
        ): Promise<void>;

        protected static override _onDeleteOperation<TDocument extends foundry.abstract.Document>(
            this: ConstructorOf<TDocument>,
            items: TDocument[],
            context: DatabaseDeleteOperation<TDocument["parent"]>,
        ): Promise<void>;
    }

    interface Item<TParent extends Actor | null = Actor | null> extends ClientBaseItem<TParent> {
        get uuid(): ItemUUID;
        get sheet(): ItemSheet<this, DocumentSheetOptions>;
    }

    namespace Item {
        const implementation: typeof Item;
    }

    type EmbeddedItemUUID = `Actor.${string}.Item.${string}`;
    type WorldItemUUID = WorldDocumentUUID<Item<null>>;
    type CompendiumItemUUID = `Compendium.${string}.Item.${string}`;
    type ItemUUID = WorldItemUUID | EmbeddedItemUUID | CompendiumItemUUID;
}
