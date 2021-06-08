import { ItemConstructor } from './constructors';

declare global {
    /**
     * The client-side Item document which extends the common BaseItem abstraction.
     * Each Item document contains ItemData which defines its data schema.
     * @see {@link data.ItemData}              The Item data schema
     * @see {@link documents.Items}            The world-level collection of Item documents
     * @see {@link applications.ItemSheet}     The Item configuration application
     */
    class Item<TParent extends Actor = Actor> extends ItemConstructor {
        /** A convenience alias of Item#parent which is more semantically intuitive */
        get actor(): TParent;

        /** A convenience reference to the image path (data.img) used to represent this Item */
        get img(): ImagePath;

        /** A convenience alias of Item#isEmbedded which is preserves legacy support */
        get isOwned(): boolean;

        /**
         * Return an array of the Active Effect instances which originated from this Item.
         * The returned instances are the ActiveEffect instances which exist on the Item itself.
         */
        get transferredEffects(): CollectionValue<this['effects']>[];

        /** A convenience reference to the item type (data.type) of this Item */
        get type(): string;

        /** Prepare a data object which defines the data schema used by dice roll commands against this Item */
        getRollData(): object;

        protected override _getSheetClass(): ConstructorOf<NonNullable<this['_sheet']>>;

        protected static override _onCreateDocuments<T extends Item>(
            this: ConstructorOf<T>,
            items: T[],
            context: DocumentModificationContext,
        ): Promise<void>;

        protected static override _onDeleteDocuments<T extends Item>(
            this: ConstructorOf<T>,
            items: T[],
            context: DocumentModificationContext,
        ): Promise<void>;
    }

    interface Item<TParent extends Actor = Actor> {
        readonly data: foundry.data.ItemData<Item, ActiveEffect>;
        readonly parent: TParent | null;
        _sheet: ItemSheet<Item>;

        getFlag(scope: string, key: string): any;
        getFlag(scope: 'core', key: 'sourceId'): string | undefined;
    }
}
