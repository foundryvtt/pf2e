export {};

declare global {
    interface ActorSheetOptions extends DocumentSheetOptions {
        token: TokenDocument | null;
    }

    interface ActorSheetData<A extends Actor> extends DocumentSheetData<A> {
        actor: any;
        data: any;
        items: any;
        cssClass: "editable" | "locked";
        effects: RawObject<foundry.data.ActiveEffectData>[];
        limited: boolean;
        options: ActorSheetOptions;
    }

    /**
     * The Actor configuration sheet.
     * This Application is responsible for rendering an actor's attributes and allowing the actor to be edited.
     * System modifications may elect to override this class to better suit their own game system by re-defining the value
     * CONFIG.Actor.sheetClass.

     * @param actor                   The Actor instance being displayed within the sheet.
     * @param options    Additional application configuration options.
     */
    class ActorSheet<TActor extends Actor = Actor, TItem extends Item = Item> extends DocumentSheet<
        TActor,
        ActorSheetOptions
    > {
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

        protected override _getSubmitData(updateData?: DocumentUpdateData<TActor>): Record<string, unknown>;

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

        protected override _onDragStart(event: ElementDragEvent): void;

        protected override _onDrop(event: ElementDragEvent): Promise<boolean | void>;

        protected override _onDragOver(event: ElementDragEvent): boolean;

        /**
         * Handle dropping of an Actor data onto another Actor sheet
         * @param event The concluding DragEvent which contains drop data
         * @param data The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropActiveEffect<D extends ActiveEffect>(
            event: ElementDragEvent,
            data?: DropCanvasData<"ActiveEffect", D>
        ): Promise<D | void>;

        /**
         * Handle dropping of an Actor data onto another Actor sheet
         * @param event The concluding DragEvent which contains drop data
         * @param data  The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropActor(event: ElementDragEvent, data: DropCanvasData<"Actor", TActor>): Promise<false | void>;

        /**
         * Handle dropping of an item reference or item data onto an Actor Sheet
         * @param event The concluding DragEvent which contains drop data
         * @param data  The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropItem(event: ElementDragEvent, data: DropCanvasData<"Item", TItem>): Promise<TItem[]>;

        /**
         * Handle dropping of a Folder on an Actor Sheet.
         * Currently supports dropping a Folder of Items to create all items as owned items.
         * @param event The concluding DragEvent which contains drop data
         * @param data  The data transfer extracted from the event
         * @return A data object which describes the result of the drop
         */
        protected _onDropFolder(event: ElementDragEvent, data: DropCanvasData<"Folder", Folder>): Promise<TItem[]>;

        /**
         * Handle the final creation of dropped Item data on the Actor.
         * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
         * @param itemData The item data requested for creation
         */
        protected _onDropItemCreate(itemData: TItem["_source"] | TItem["_source"][]): Promise<TItem[]>;

        /**
         * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
         * @param  event
         * @param itemData
         */
        protected _onSortItem(event: ElementDragEvent, itemData: TItem["_source"]): Promise<TItem[]>;
    }
}
