import type { ClientBaseActor } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Actor document which extends the common BaseActor model.
     *
     * @category - Documents
     *
     * @see {@link documents.Actors}            The world-level collection of Actor documents
     * @see {@link applications.ActorSheet}     The Actor configuration application
     *
     * @example Create a new Actor
     * ```js
     * let actor = await Actor.create({
     *   name: "New Test Actor",
     *   type: "character",
     *   img: "artwork/character-profile.jpg"
     * });
     * ```
     *
     * @example Retrieve an existing Actor
     * ```js
     * let actor = game.actors.get(actorId);
     * ```
     */
    class Actor<TParent extends TokenDocument | null = TokenDocument | null> extends ClientBaseActor<TParent> {
        /** An object that tracks which tracks the changes to the data model which were applied by active effects */
        overrides: Omit<DeepPartial<this["_source"]>, "prototypeToken">;

        /** The statuses that are applied to this actor by active effects */
        statuses: Set<string>;

        /**
         * A cached array of image paths which can be used for this Actor's token.
         * Null if the list has not yet been populated.
         */
        protected _tokenImages: string[] | null;

        /** Cache the last drawn wildcard token to avoid repeat draws */
        protected _lastWildcard: string | null;

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Provide a thumbnail image path used to represent this document. */
        get thumbnail(): this["img"];

        /** Provide an object which organizes all embedded Item instances by their type */
        get itemTypes(): object;

        /** Test whether an Actor is a synthetic representation of a Token (if true) or a full Document (if false) */
        get isToken(): boolean;

        /** Retrieve the list of ActiveEffects that are currently applied to this Actor. */
        get appliedEffects(): ActiveEffect<this>[];

        /** An array of ActiveEffect instances which are present on the Actor which have a limited duration. */
        get temporaryEffects(): ActiveEffect<this>[];

        /** Return a reference to the TokenDocument which owns this Actor as a synthetic override */
        get token(): TParent;

        /** Whether the Actor has at least one Combatant in the active Combat that represents it. */
        get inCombat(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

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
        getActiveTokens(linked: boolean | undefined, document: true): TokenDocument<Scene>[];
        getActiveTokens(linked?: boolean | undefined, document?: false): Token<TokenDocument<Scene>>[];
        getActiveTokens(linked?: boolean, document?: boolean): TokenDocument<Scene>[] | Token<TokenDocument<Scene>>[];

        /**
         * Get all ActiveEffects that may apply to this Actor.
         * If CONFIG.ActiveEffect.legacyTransferral is true, this is equivalent to actor.effects.contents.
         * If CONFIG.ActiveEffect.legacyTransferral is false, this will also return all the transferred ActiveEffects on any
         * of the Actor's owned Items.
         */
        allApplicableEffects(): Generator<ActiveEffect<this>, void, void>;

        /** Prepare a data object which defines the data schema used by dice roll commands against this Actor */
        getRollData(): Record<string, unknown>;

        /**
         * Create a new Token document, not yet saved to the database, which represents the Actor.
         * @param [data={}] Additional data, such as x, y, rotation, etc. for the created token data
         * @returns The created TokenDocument instance
         */
        getTokenDocument(data?: DeepPartial<foundry.documents.TokenSource>): Promise<NonNullable<TParent>>;

        /** Get an Array of Token images which could represent this Actor */
        getTokenImages(): Promise<(ImageFilePath | VideoFilePath)[]>;

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

        override prepareEmbeddedDocuments(): void;

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

        /**
         * Toggle a configured status effect for the Actor.
         * @param   statusId                A status effect ID defined in CONFIG.statusEffects
         * @param   [options={}]            Additional options which modify how the effect is created
         * @param   [options.active]        Force the effect to be active or inactive regardless of its current state
         * @param   [options.overlay=false] Display the toggled effect as an overlay
         * @returns A promise which resolves to one of the following values:
         *                                 - ActiveEffect if a new effect need to be created
         *                                 - true if was already an existing effect
         *                                 - false if an existing effect needed to be removed
         *                                 - undefined if no changes need to be made
         */
        toggleStatusEffect(
            statusId: string,
            options?: { active?: boolean; overlay?: boolean },
        ): Promise<ActiveEffect<this> | boolean | void>;

        /**
         * Request wildcard token images from the server and return them.
         * @param actorId   The actor whose prototype token contains the wildcard image path.
         * @param [options]
         * @param [options.pack] The name of the compendium the actor is in.
         */
        protected static _requestTokenImages(
            actorId: string,
            options?: { pack?: string },
        ): Promise<(ImageFilePath | VideoFilePath)[]>;

        /* -------------------------------------------- */
        /*  Tokens                                      */
        /* -------------------------------------------- */

        /**
         * Get this actor's dependent tokens.
         * If the actor is a synthetic token actor, only the exact Token which it represents will be returned.
         * @param [options]
         * @param [options.scenes] A single Scene, or list of Scenes to filter by.
         * @param [options.linked] Limit the results to tokens that are linked to the actor.
         */
        getDependentTokens(options?: {
            scenes?: NonNullable<NonNullable<TParent>["parent"]> | NonNullable<NonNullable<TParent>["parent"]>[];
            linked?: boolean;
        }): NonNullable<TParent>[];

        /**
         * Register a token as a dependent of this actor.
         * @param token  The token.
         * @internal
         */
        _registerDependentToken(token: NonNullable<TParent>): void;

        /**
         * Remove a token from this actor's dependents.
         * @param token The token.
         * @internal
         */
        _unregisterDependentToken(token: NonNullable<TParent>): void;

        /**
         * Prune a whole scene from this actor's dependent tokens.
         * @param scene  The scene.
         * @internal
         */
        _unregisterDependentScene(scene: NonNullable<NonNullable<TParent>["parent"]>): void;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        protected override _preCreate(
            data: this["_source"],
            options: DatabaseCreateOperation<TParent>,
            user: User,
        ): Promise<boolean | void>;

        /**
         * When an Actor is being created, apply default token configuration settings to its prototype token.
         * @param data    Data explicitly provided to the creation workflow
         * @param options Options which configure creation
         * @param [options.fromCompendium] Does this creation workflow originate via compendium import?
         */
        protected _applyDefaultTokenSettings(
            data: this["_source"],
            options?: { fromCompendium?: boolean },
        ): DeepPartial<this["_source"]>;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DatabaseUpdateOperation<TParent>,
            userId: string,
        ): void;

        protected override _onCreateDescendantDocuments(
            parent: this,
            collection: "effects" | "items",
            documents: ActiveEffect<this>[] | Item<this>[],
            result: ActiveEffect<this>["_source"][] | Item<this>["_source"][],
            options: DatabaseCreateOperation<this>,
            userId: string,
        ): void;

        protected override _onUpdateDescendantDocuments(
            parent: this,
            collection: "effects" | "items",
            documents: ActiveEffect<this>[] | Item<this>[],
            changes: ActiveEffect<this>["_source"][] | Item<this>["_source"][],
            options: DatabaseUpdateOperation<this>,
            userId: string,
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
            options?: DatabaseUpdateOperation<TParent>,
        ): void;
    }

    interface Actor<TParent extends TokenDocument | null = TokenDocument | null> extends ClientBaseActor<TParent> {
        readonly effects: foundry.abstract.EmbeddedCollection<ActiveEffect<this>>;
        readonly items: foundry.abstract.EmbeddedCollection<Item<this>>;

        get sheet(): ActorSheet<Actor>;

        get uuid(): ActorUUID;
    }

    namespace Actor {
        const implementation: typeof Actor;
    }

    type CompendiumActorUUID = `Compendium.${string}.Actor.${string}`;
    type ActorUUID = `Actor.${string}` | `${TokenDocumentUUID}.Actor.${string}` | CompendiumActorUUID;
}
