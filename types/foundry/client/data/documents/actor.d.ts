import type { ClientBaseActor } from "./client-base-mixes.d.ts";

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
    class Actor<TParent extends TokenDocument<Scene | null> | null> extends ClientBaseActor<TParent> {
        constructor(data: PreCreate<foundry.documents.ActorSource>, context?: DocumentConstructionContext<TParent>);

        /** An object that tracks which tracks the changes to the data model which were applied by active effects */
        overrides: Omit<DeepPartial<this["_source"]>, "prototypeToken">;

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
        get itemTypes(): object;

        /** Test whether an Actor is a synthetic representation of a Token (if true) or a full Document (if false) */
        get isToken(): boolean;

        /** An array of ActiveEffect instances which are present on the Actor which have a limited duration. */
        get temporaryEffects(): TemporaryEffect[];

        /** Return a reference to the TokenDocument which owns this Actor as a synthetic override */
        get token(): TParent | null;

        /** A convenience reference to the item type (data.type) of this Actor */
        get type(): string;

        override get uuid(): ActorUUID;

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
        getActiveTokens(
            linked?: boolean,
            document?: boolean
        ): Token<TokenDocument<Scene | null>>[] | TokenDocument<Scene | null>[];

        /** Prepare a data object which defines the data schema used by dice roll commands against this Actor */
        getRollData(): Record<string, unknown>;

        protected override _getSheetClass(): ConstructorOf<NonNullable<this["_sheet"]>>;

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
        rollInitiative(options?: {
            createCombatants?: boolean;
            rerollInitiative?: boolean;
            initiativeOptions?: object;
        }): Promise<Combat | null>;

        override getEmbeddedCollection(embeddedName: "ActiveEffect"): this["effects"];
        override getEmbeddedCollection(embeddedName: "Item"): this["items"];
        override getEmbeddedCollection(embeddedName: "ActiveEffect" | "Item"): this["effects"] | this["items"];

        protected override _preCreate(
            data: PreDocumentId<this["_source"]>,
            options: DocumentModificationContext<TParent>,
            user: User
        ): Promise<void>;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentUpdateContext<TParent>,
            userId: string
        ): void;

        protected override _onCreateDescendantDocuments(
            parent: this,
            collection: "effects" | "items",
            documents: ActiveEffect<this>[] | Item<this>[],
            result: ActiveEffect<this>["_source"][] | Item<this>["_source"][],
            options: DocumentModificationContext<this>,
            userId: string
        ): void;

        protected override _onUpdateDescendantDocuments(
            parent: this,
            collection: "effects" | "items",
            documents: ActiveEffect<this>[] | Item<this>[],
            changes: ActiveEffect<this>["_source"][] | Item<this>["_source"][],
            options: DocumentModificationContext<this>,
            userId: string
        ): void;

        /** Additional workflows to perform when any descendant document within this Actor changes. */
        protected _onEmbeddedDocumentChange(): void;

        /**
         * Update the active TokenDocument instances which represent this Actor.
         * @param [update]  The update delta.
         * @param [options] The update context.
         */
        protected _updateDependentTokens(
            update?: Record<string, unknown>,
            options?: DocumentModificationContext<TParent>
        ): void;
    }

    interface Actor<TParent extends TokenDocument<Scene | null> | null> extends ClientBaseActor<TParent> {
        readonly effects: foundry.abstract.EmbeddedCollection<ActiveEffect<this>>;
        readonly items: foundry.abstract.EmbeddedCollection<Item<this>>;

        prototypeToken: foundry.data.PrototypeToken<this>;

        _sheet: ActorSheet<this> | null;

        get sheet(): ActorSheet<this>;

        get folder(): Folder<Actor<null>> | null;

        deleteEmbeddedDocuments(
            embeddedName: "ActiveEffect",
            ids: string[],
            context?: DocumentModificationContext<this>
        ): Promise<CollectionValue<this["effects"]>[]>;
        deleteEmbeddedDocuments(
            embeddedName: "Item",
            ids: string[],
            context?: DocumentModificationContext<this>
        ): Promise<CollectionValue<this["items"]>[]>;
        deleteEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            ids: string[],
            context?: DocumentModificationContext<this>
        ): Promise<CollectionValue<this["effects"]>[] | CollectionValue<this["items"]>[]>;
    }

    type CompendiumActorUUID = `Compendium.${string}.Actor.${string}`;
    type ActorUUID = `Actor.${string}` | `${TokenDocumentUUID}.Actor.${string}` | CompendiumActorUUID;
}
