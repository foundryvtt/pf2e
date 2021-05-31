export {};

declare global {
    interface ActorSheetOptions extends DocumentSheetOptions {
        token: TokenDocument | null;
    }

    interface ActorSheetData<A extends Actor> extends DocumentSheetData<A> {
        actor: any;
        data: any;
        items: any;
        cssClass: 'editable' | 'locked';
        effects: RawObject<A['data']>['effects'];
        limited: boolean;
        options: ActorSheetOptions;
    }

    /**
     * The default Actor Sheet
     *
     * This Application is responsible for rendering an actor's attributes and allowing the actor to be edited.
     *
     * System modifications may elect to override this class to better suit their own game system by re-defining the value
     * ``CONFIG.Actor.sheetClass``.
     *
     * @param actor            The Actor instance being displayed within the sheet.
     * @param options          Additional options which modify the rendering of the Actor's sheet.
     * @param options.editable Is the Actor editable? Default is true.
     */
    class ActorSheet<TActor extends Actor = Actor, TItem extends Item = Item> extends DocumentSheet<
        TActor,
        ActorSheetOptions
    > {
        /** @override */
        static get defaultOptions(): ActorSheetOptions;

        /** If this Actor Sheet represents a synthetic Token actor, reference the active Token */
        token: TActor['parent'];

        /** @override */
        get id(): `actor-${string}` | `actor-${string}-${string}`;

        /** @override */
        get title(): string;

        /** A convenience reference to the Actor document */
        get actor(): TActor;

        /** @override */
        getData(options?: ActorSheetOptions): ActorSheetData<TActor>;

        /**
         * Handle requests to configure the prototype Token for the Actor
         */
        protected _onConfigureToken(event: Event): void;

        /**
         * Handle requests to configure the default sheet used by this Actor
         */
        protected _onConfigureSheet(event: Event): void;

        /**
         * Handle changing the actor profile image by opening a FilePicker
         */
        protected _onEditImage(event: Event): void;

        /**
         * Allow the Actor sheet to be a displayed as a valid drop-zone
         */
        protected _onDragOver(event: ElementDragEvent): boolean;

        /**
         * Handle dropped data on the Actor sheet
         */
        protected _onDrop(event: ElementDragEvent): Promise<boolean | any>;

        /**
         * Handle the final creation of dropped Item data on the Actor.
         * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
         * @param itemData The item data requested for creation
         */
        protected _onDropItemCreate(itemData: TItem['data']['_source']): Promise<TItem[]>;

        /* -------------------------------------------- */
        /*  Owned Item Sorting                          */
        /* -------------------------------------------- */

        /**
         * Handle dropping of an item reference or item data onto an Actor Sheet
         * @param event The concluding DragEvent which contains drop data
         * @param data The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onSortItem(event: ElementDragEvent, itemData: TItem['data']['_source']): Promise<TItem[]>;
    }
}
