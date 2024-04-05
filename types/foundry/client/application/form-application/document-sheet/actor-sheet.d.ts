export {};

declare global {
    /**
     * The Application responsible for displaying and editing a single Actor document.
     * This Application is responsible for rendering an actor's attributes and allowing the actor to be edited.
     * @category - Applications
     * @param actor     The Actor instance being displayed within the sheet.
     * @param [options] Additional application configuration options.
     */
    class ActorSheet<TActor extends Actor, TItem extends Item = Item> extends DocumentSheet<TActor, ActorSheetOptions> {
        static override get defaultOptions(): ActorSheetOptions;

        override get id(): string;

        override get title(): string;

        /** A convenience reference to the Actor document */
        get actor(): TActor;

        /** If this Actor Sheet represents a synthetic Token actor, reference the active Token */
        get token(): TActor["parent"];

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override close(options?: { force?: boolean }): Promise<void>;

        override getData(options?: ActorSheetOptions): ActorSheetData<TActor> | Promise<ActorSheetData<TActor>>;

        protected override _getHeaderButtons(): ApplicationHeaderButton[];

        protected override _getSubmitData(updateData?: Record<string, unknown>): Record<string, unknown>;

        /* -------------------------------------------- */
        /*  Event Listeners                             */
        /* -------------------------------------------- */

        /** Handle requests to configure the prototype Token for the Actor */
        protected _onConfigureToken(event: Event): void;

        /**
         * Handle requests to configure the default sheet used by this Actor
         */
        protected _onConfigureSheet(event: Event): void;

        /**
         * Handle changing the actor profile image by opening a FilePicker
         */
        protected _onEditImage(event: Event): void;

        /* -------------------------------------------- */
        /*  Drag and Drop                               */
        /* -------------------------------------------- */

        protected override _canDragStart(selector: string): boolean;

        protected override _canDragDrop(selector: string): boolean;

        protected override _onDragStart(event: DragEvent): void;

        protected override _onDrop(event: DragEvent): Promise<boolean | void>;

        protected override _onDragOver(event: DragEvent): boolean;

        /**
         * Handle dropping of an Actor data onto another Actor sheet
         * @param event The concluding DragEvent which contains drop data
         * @param data The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropActiveEffect<TDocument extends ActiveEffect<TActor>>(
            event: DragEvent,
            data?: DropCanvasData<"ActiveEffect", TDocument>,
        ): Promise<TDocument | void>;

        /**
         * Handle dropping of an Actor data onto another Actor sheet
         * @param event The concluding DragEvent which contains drop data
         * @param data  The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropActor(event: DragEvent, data: DropCanvasData<"Actor", TActor>): Promise<false | void>;

        /**
         * Handle dropping of an item reference or item data onto an Actor Sheet
         * @param event The concluding DragEvent which contains drop data
         * @param data  The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropItem(event: DragEvent, data: DropCanvasData<"Item", TItem>): Promise<TItem[]>;

        /**
         * Handle dropping of a Folder on an Actor Sheet.
         * Currently supports dropping a Folder of Items to create all items as owned items.
         * @param event The concluding DragEvent which contains drop data
         * @param data  The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropFolder(event: DragEvent, data: DropCanvasData<"Folder", Folder>): Promise<TItem[]>;

        /**
         * Handle the final creation of dropped Item data on the Actor.
         * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
         * @param itemData The item data requested for creation
         */
        protected _onDropItemCreate(
            itemData: foundry.documents.ItemSource | foundry.documents.ItemSource[],
        ): Promise<Item<TActor>[]>;

        /** Handle a drop event for an existing embedded Item to sort that Item relative to its siblings */
        protected _onSortItem(event: DragEvent, itemData: TItem["_source"]): Promise<TItem[]>;
    }

    interface ActorSheetOptions extends DocumentSheetOptions {
        token: TokenDocument | null;
    }

    interface ActorSheetData<TActor extends Actor> extends DocumentSheetData<TActor> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actor: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: any;
        cssClass: "editable" | "locked";
        effects: RawObject<ActiveEffect<TActor>>[];
        limited: boolean;
        options: Partial<ActorSheetOptions>;
    }
}
