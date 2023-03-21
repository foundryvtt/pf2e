import { CanvasBaseToken } from "./client-base-mixes.mjs";

declare global {
    class TokenDocument<TParent extends Scene | null> extends CanvasBaseToken<TParent> {
        constructor(
            data: PreCreate<foundry.documents.TokenSource>,
            context?: TokenDocumentConstructionContext<TParent, Actor<TokenDocument<Scene | null>> | null>
        );

        /** An array of detection modes which are available to this Token */
        detectionModes: TokenDetectionMode[];

        sort: number;

        /**
         * A lazily evaluated reference to the Actor this Token modifies.
         * If actorLink is true, then the document is the primary Actor document.
         * Otherwise, the Actor document is a synthetic (ephemeral) document constructed using the Token's actorData.
         */
        get actor(): Actor<this | null> | null;

        /** An indicator for whether or not the current User has full control over this Token document. */
        override get isOwner(): boolean;

        /** A convenient reference for whether this TokenDocument is linked to the Actor it represents, or is a synthetic copy */
        get isLinked(): this["actorLink"];

        /** Return a reference to a Combatant that represents this Token, if one is present in the current encounter. */
        get combatant(): Combatant<Combat, this> | null;

        /** An indicator for whether or not this Token is currently involved in the active combat encounter. */
        get inCombat(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        override prepareBaseData(): void;

        /**
         * Prepare detection modes which are available to the Token.
         * Ensure that every Token has the basic sight detection mode configured.
         */
        protected _prepareDetectionModes(): void;

        override clone(
            data: DeepPartial<this["_source"]> | undefined,
            options: { save: true; keepId?: boolean }
        ): Promise<this>;
        override clone(data?: DeepPartial<this["_source"]>, options?: { save?: false; keepId?: boolean }): this;
        override clone(
            data?: DeepPartial<this["_source"]>,
            options?: { save?: boolean; keepId?: boolean }
        ): this | Promise<this>;

        /**
         * Create a synthetic Actor using a provided Token instance
         * If the Token data is linked, return the true Actor document
         * If the Token data is not linked, create a synthetic Actor using the Token's actorData override
         */
        getActor(): Actor<this | null> | null;

        /**
         * A helper method to retrieve the underlying data behind one of the Token's attribute bars
         * @param barName     The named bar to retrieve the attribute for
         * @param alternative An alternative attribute path to get instead of the default one
         * @return The attribute displayed on the Token bar, if any
         */
        getBarAttribute(barName: string, { alternative }?: { alternative?: string }): TokenResourceData | null;

        /**
         * Test whether a Token has a specific status effect.
         * @param statusId The status effect ID as defined in CONFIG.statusEffects
         * @returns Does the Token have this status effect?
         */
        hasStatusEffect(statusId: string): boolean;

        /* -------------------------------------------- */
        /*  Actor Data Operations                       */
        /* -------------------------------------------- */

        /**
         * Redirect updates to a synthetic Token Actor to instead update the tokenData override object.
         * Once an attribute in the Token has been overridden, it must always remain overridden.
         *
         * @param update   The provided differential update data which should update the Token Actor
         * @param options  Provided options which modify the update request
         * @returns The updated un-linked Actor instance
         */
        modifyActorDocument(
            update: Record<string, unknown>,
            options: DocumentModificationContext<this>
        ): Promise<Actor<this>[]>;

        /**
         * Redirect creation of Documents within a synthetic Token Actor to instead update the tokenData override object.
         * @param embeddedName The named embedded Document type being modified
         * @param data The provided initial data with which to create the embedded Documents
         * @param options Provided options which modify the creation request
         * @returns The created Embedded Document instances
         */
        createActorEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            data: PreCreate<foundry.documents.ActiveEffectSource>[] | Partial<foundry.documents.ActiveEffectSource>[],
            options?: DocumentModificationContext<this>
        ): ActiveEffect<Actor<this>> | Item<Actor<this>>[];

        /**
         * Redirect updating of Documents within a synthetic Token Actor to instead update the tokenData override object.
         * @param embeddedName The named embedded Document type being modified
         * @param updates      The provided differential data with which to update the embedded Documents
         * @param options      Provided options which modify the update request
         * @returns The updated Embedded Document instances
         */
        updateActorEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            updates: EmbeddedDocumentUpdateData<ActiveEffect<Actor<this>> | Item<Actor<this>>>[],
            options: DocumentModificationContext<this>
        ): Promise<ActiveEffect<Actor<this>>[] | Item<Actor<this>>[]>;

        /**
         * Redirect deletion of Documents within a synthetic Token Actor to instead update the tokenData override object.
         * @param embeddedName The named embedded Document type being modified
         * @param ids          The provided differential data with which to update the embedded Documents
         * @param options      Provided options which modify the update request
         * @returns The updated Embedded Document instances
         */
        deleteActorEmbeddedDocuments(
            embeddedName: "ActiveEffect" | "Item",
            ids: string[],
            options: DocumentModificationContext<this>
        ): Promise<ActiveEffect<Actor<this>>[] | Item<Actor<this>>[]>;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        protected override _preUpdate(
            data: DocumentUpdateData<this>,
            options: TokenUpdateContext<TParent>,
            user: User
        ): Promise<void>;

        /** When the Actor data overrides change for an un-linked Token Actor, simulate the pre-update process. */
        protected _preUpdateTokenActor(
            data: DocumentUpdateData<Actor<this>>,
            options: TokenUpdateContext<TParent>,
            userId: string
        ): Promise<void>;

        protected override _onUpdate(
            changed: DeepPartial<this["_source"]>,
            options: DocumentModificationContext<TParent>,
            userId: string
        ): void;

        /** When the base Actor for a TokenDocument changes, we may need to update its Actor instance */
        _onUpdateBaseActor(update?: Record<string, unknown>, options?: DocumentModificationContext<null>): void;

        /** When the Actor data overrides change for an un-linked Token Actor, simulate the post-update process. */
        protected _onUpdateTokenActor(
            data: DeepPartial<this["_source"]["actorData"]>,
            options: DocumentModificationContext<TParent>,
            userId: string
        ): void;

        /** Get an Array of attribute choices which could be tracked for Actors in the Combat Tracker */
        static getTrackedAttributes(data?: Record<string, unknown>, _path?: string[]): TokenAttributes;

        /** Inspect the Actor data model and identify the set of attributes which could be used for a Token Bar */
        static getTrackedAttributeChoices(attributes: TokenAttributes): TokenAttributes;
    }

    interface TokenDocument<TParent extends Scene | null> extends CanvasBaseToken<TParent> {
        get object(): Token<this> | null;
        get sheet(): TokenConfig<this>;
        get uuid(): TokenDocumentUUID;
    }

    interface TokenDocumentConstructionContext<
        TParent extends Scene | null,
        TActor extends Actor<TokenDocument<Scene | null>> | null
    > extends DocumentConstructionContext<TParent> {
        actor?: TActor;
    }

    interface TokenUpdateContext<TParent extends Scene | null> extends DocumentModificationContext<TParent> {
        action?: "create" | "update" | "delete";
        embedded?: { embeddedName: string; hookData: { _id?: string }[] };
    }

    type TokenDocumentUUID = `Scene.${string}.Token.${string}`;

    interface TokenAttributes {
        bar: string[];
        value: number[];
    }
}
