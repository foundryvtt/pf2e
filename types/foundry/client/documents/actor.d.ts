import { ActorConstructor } from "./constructors";

declare global {
    /**
     * The client-side Actor document which extends the common BaseActor abstraction.
     * Each Actor document contains ActorData which defines its data schema.
     *
     * @see {@link data.ActorData}              The Actor data schema
     * @see {@link documents.Actors}            The world-level collection of Actor documents
     * @see {@link applications.ActorConfig}    The Actor configuration application
     *
     * @example <caption>Create a new Actor</caption>
     * let actor = await Actor.create({
     *   name: "New Test Actor",
     *   type: "character",
     *   img: "artwork/character-profile.jpg"
     * });
     *
     * @example <caption>Retrieve an existing Actor</caption>
     * let actor = game.actors.get(actorId);
     */
    class Actor<
        TParent extends TokenDocument = TokenDocument,
        TItemTypeMap extends ItemTypeMap = ItemTypeMap
    > extends ActorConstructor {
        constructor(data: PreCreate<foundry.data.ActorSource>, context?: DocumentConstructionContext<Actor>);

        /** An object that tracks which tracks the changes to the data model which were applied by active effects */
        overrides: DeepPartial<this["_source"]> & { token?: TParent["_source"] };

        /**
         * A cached array of image paths which can be used for this Actor's token.
         * Null if the list has not yet been populated.
         */
        protected _tokenImages: string[] | null;

        /** Cache the last drawn wildcard token to avoid repeat draws */
        protected _lastWildcard: string | null;

        /** A convenient reference to the file path of the Actor's profile image */
        get img(): ImageFilePath;

        /** Provide an object which organizes all embedded Item instances by their type */
        get itemTypes(): { [K in keyof TItemTypeMap]: Embedded<TItemTypeMap[K]>[] };

        /** Test whether an Actor is a synthetic representation of a Token (if true) or a full Document (if false) */
        get isToken(): boolean;

        /** An array of ActiveEffect instances which are present on the Actor which have a limited duration. */
        get temporaryEffects(): TemporaryEffect[];

        /** Return a reference to the TokenDocument which owns this Actor as a synthetic override */
        get token(): TParent | null;

        /** A convenience reference to the item type (data.type) of this Actor */
        get type(): string;

        override get uuid(): ActorUUID | TokenDocumentUUID;

        /** Apply any transformations to the Actor data which are caused by ActiveEffects. */
        applyActiveEffects(): void;

        /**
         * Retrieve an Array of active tokens which represent this Actor in the current canvas Scene.
         * If the canvas is not currently active, or there are no linked actors, the returned Array will be empty.
         * If the Actor is a synthetic token actor, only the exact Token which it represents will be returned.
         *
         * @param [linked=false]   Limit results to Tokens which are linked to the Actor. Otherwise return all Tokens,
                                   even those which are not linked.
         * @param [document=false] Return the Document instance rather than the PlaceableObject
         * @return An array of Token instances in the current Scene which reference this Actor.
         */
        getActiveTokens(linked: boolean | undefined, document: true): Embedded<NonNullable<TParent>>[];
        getActiveTokens(linked?: undefined, document?: undefined): NonNullable<TParent["object"]>[];
        getActiveTokens(
            linked?: boolean,
            document?: boolean
        ): Embedded<NonNullable<TParent>>[] | NonNullable<TParent["object"]>[];

        /** Prepare a data object which defines the data schema used by dice roll commands against this Actor */
        getRollData(): Record<string, unknown>;

        protected override _getSheetClass(): ConstructorOf<NonNullable<this["_sheet"]>>;

        /**
         * Create a new TokenData object which can be used to create a Token representation of the Actor.
         * @param [data={}] Additional data, such as x, y, rotation, etc. for the created token data
         * @return The created TokenData instance
         */
        getTokenData(data?: DocumentModificationContext): Promise<TParent["data"]>;

        /** Get an Array of Token images which could represent this Actor */
        getTokenImages(): Promise<ImageFilePath[]>;

        /**
         * Handle how changes to a Token attribute bar are applied to the Actor.
         * This allows for game systems to override this behavior and deploy special logic.
         * @param attribute The attribute path
         * @param value     The target attribute value
         * @param isDelta   Whether the number represents a relative change (true) or an absolute change (false)
         * @param isBar     Whether the new value is part of an attribute bar, or just a direct value
         * @return The updated Actor document
         */
        modifyTokenAttribute(attribute: string, value: number, isDelta?: boolean, isBar?: boolean): Promise<this>;

        /**
         * Roll initiative for all Combatants in the currently active Combat encounter which are associated with this Actor.
         * If viewing a full Actor entity, all Tokens which map to that actor will be targeted for initiative rolls.
         * If viewing a synthetic Token actor, only that particular Token will be targeted for an initiative roll.
         *
         * @param options Configuration for how initiative for this Actor is rolled.
         * @param [options.createCombatants=false] Create new Combatant entries for Tokens associated with this actor.
         * @param [options.rerollInitiative=false] Re-roll the initiative for this Actor if it has already been rolled.
         * @param [options.initiativeOptions={}]   Additional options passed to the Combat#rollInitiative method.
         * @return A promise which resolves to the Combat entity once rolls are complete.
         */
        rollInitiative({
            createCombatants,
            rerollInitiative,
            initiativeOptions,
        }?: {
            createCombatants?: boolean;
            rerollInitiative?: boolean;
            initiativeOptions?: object;
        }): Promise<Combat | null>;

        override getEmbeddedCollection(embeddedName: "ActiveEffect"): this["effects"];
        override getEmbeddedCollection(embeddedName: "Item"): this["items"];
        override getEmbeddedCollection(embeddedName: "ActiveEffect" | "Item"): this["effects"] | this["items"];

        protected override _preCreate(
            data: PreDocumentId<this["_source"]>,
            options: DocumentModificationContext<this>,
            user: User
        ): Promise<void>;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentUpdateContext<this>,
            userId: string
        ): void;

        protected override _onCreateEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            documents: ActiveEffect[] | Item[],
            result: foundry.data.ActiveEffectSource[] | foundry.data.ItemSource[],
            options: DocumentModificationContext,
            userId: string
        ): void;

        protected override _onUpdateEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            documents: ActiveEffect[] | Item[],
            result: foundry.data.ActiveEffectSource[] | foundry.data.ItemSource[],
            options: DocumentModificationContext,
            userId: string
        ): void;

        protected override _onDeleteEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            documents: ActiveEffect[] | Item[],
            result: foundry.data.ActiveEffectSource[] | foundry.data.ItemSource[],
            options: DocumentModificationContext,
            userId: string
        ): void;

        /**
         * Perform various actions on active tokens if embedded documents were changed.
         * @param embeddedName The type of embedded document that was modified.
         */
        protected _onEmbeddedDocumentChange(embeddedName: "Item" | "ActiveEffect"): void;
    }

    interface Actor<TParent extends TokenDocument = TokenDocument> {
        readonly data: foundry.data.ActorData<Actor, ActiveEffect, Item>;

        readonly parent: TParent | null;

        readonly items: foundry.abstract.EmbeddedCollection<Item>;

        readonly effects: foundry.abstract.EmbeddedCollection<ActiveEffect>;

        prototypeToken: foundry.data.PrototypeToken;

        get collection(): Actors<this>;

        _sheet: ActorSheet<this, Item> | null;

        get sheet(): ActorSheet<this, Item>;

        get folder(): Folder<this> | null;

        deleteEmbeddedDocuments(
            embeddedName: "ActiveEffect",
            dataId: string[],
            context?: DocumentModificationContext
        ): Promise<ActiveEffect[]>;
        deleteEmbeddedDocuments(
            embeddedName: "Item",
            dataId: string[],
            context?: DocumentModificationContext
        ): Promise<Item[]>;
        deleteEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            dataId: string[],
            context?: DocumentModificationContext
        ): Promise<ActiveEffect[] | Item[]>;
    }

    namespace Actor {
        function create<A extends Actor>(
            this: ConstructorOf<A>,
            data: PreCreate<A["_source"]>,
            context?: DocumentModificationContext
        ): Promise<A | undefined>;
        function create<A extends Actor>(
            this: ConstructorOf<A>,
            data: PreCreate<A["_source"]>[],
            context?: DocumentModificationContext
        ): Promise<A[]>;
        function create<A extends Actor>(
            this: ConstructorOf<A>,
            data: PreCreate<A["_source"]>[] | PreCreate<A["_source"]>,
            context?: DocumentModificationContext
        ): Promise<A[] | A | undefined>;
    }

    type ActorUUID = `Actor.${string}` | CompendiumUUID;
}

type ItemTypeMap = Record<string, Item>;
