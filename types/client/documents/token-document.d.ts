import { TokenDocumentConstructor } from './constructors';

declare global {
    class TokenDocument<
        TActor extends foundry.documents.BaseActor = foundry.documents.BaseActor,
    > extends TokenDocumentConstructor {
        /** @override */
        constructor(data: Partial<foundry.data.TokenSource>, context: DocumentModificationContext);

        /**
         * A cached reference to the Actor document that this Token modifies.
         * This may be a "synthetic" unlinked Token Actor which does not exist in the World.
         */
        protected readonly _actor: TActor | null;

        /**
         * A lazily evaluated reference to the Actor this Token modifies.
         * If actorLink is true, then the entity is the primary Actor document.
         * Otherwise the Actor entity is a synthetic (ephemeral) document constructed using the Token's actorData.
         */
        get actor(): TActor | null;

        /** An indicator for whether or not the current User has full control over this Token document. */
        get isOwner(): boolean;

        /** A convenient reference for whether this TokenDocument is linked to the Actor it represents, or is a synthetic copy */
        get isLinked(): this['data']['actorLink'];

        /** Return a reference to a Combatant that represents this Token, if one is present in the current encounter. */
        get combatant(): 'Combatant' | null;

        /** An indicator for whether or not this Token is currently involved in the active combat encounter. */
        get inCombat(): boolean;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Create a synthetic Actor using a provided Token instance
         * If the Token data is linked, return the true Actor entity
         * If the Token data is not linked, create a synthetic Actor using the Token's actorData override
         */
        getActor(): TActor | null;

        /**
         * A helper method to retrieve the underlying data behind one of the Token's attribute bars
         * @param barName     The named bar to retrieve the attribute for
         * @param alternative An alternative attribute path to get instead of the default one
         * @return The attribute displayed on the Token bar, if any
         */
        getBarAttribute(barName: string, { alternative }?: { alternative?: string }): object | null;

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
        modifyActorDocument(update: Record<string, unknown>, options: DocumentModificationContext): Promise<TActor[]>;

        /** @override */
        // getEmbeddedCollection(embeddedName: 'Item' | 'ActiveEffect'): ReturnType<TActor['getEmbeddedCollection']>;

        /**
         * Redirect creation of Documents within a synthetic Token Actor to instead update the tokenData override object.
         * @param embeddedName The named embedded Document type being modified
         * @param data The provided initial data with which to create the embedded Documents
         * @param options Provided options which modify the creation request
         * @returns The created Embedded Document instances
         */
        createActorEmbeddedDocuments(
            embeddedName: 'Actor' | 'Item',
            data: Partial<foundry.data.ActorSource>[] | Partial<foundry.data.ActiveEffectSource>[],
            options?: DocumentModificationContext,
        ): foundry.abstract.Document[];

        /**
         * Redirect updating of Documents within a synthetic Token Actor to instead update the tokenData override object.
         * @param embeddedName The named embedded Document type being modified
         * @param updates      The provided differential data with which to update the embedded Documents
         * @param options      Provided options which modify the update request
         * @returns The updated Embedded Document instances
         */
        updateActorEmbeddedDocuments(
            embeddedName: 'Item' | 'ActiveEffect',
            updates: Record<string, unknown>,
            options: DocumentModificationContext,
        ): Promise<foundry.documents.BaseItem[]> | Promise<foundry.documents.BaseActiveEffect[]>;

        /**
         * Redirect deletion of Documents within a synthetic Token Actor to instead update the tokenData override object.
         * @param embeddedName The named embedded Document type being modified
         * @param ids          The provided differential data with which to update the embedded Documents
         * @param options      Provided options which modify the update request
         * @returns The updated Embedded Document instances
         */
        deleteActorEmbeddedDocuments(
            embeddedName: 'Item' | 'ActiveEffect',
            ids: string[],
            options: DocumentModificationContext,
        ): Promise<foundry.documents.BaseItem[]> | Promise<foundry.documents.BaseActiveEffect[]>;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        /** @override */
        protected _preUpdate(
            data: DocumentUpdateData<this>,
            options: DocumentModificationContext,
            user: foundry.documents.BaseUser,
        ): Promise<void>;

        /**
         * When the Actor data overrides change for an un-linked Token Actor, simulate the pre-update process.
         * @override
         */
        protected _preUpdateTokenActor(
            data: DocumentUpdateData<TActor>,
            options: DocumentModificationContext,
            userId: string,
        ): Promise<void>;

        /** @inheritdoc */
        protected _onUpdate(data: DocumentUpdateData<this>, options: DocumentModificationContext, userId: string): void;

        /** When the base Actor for a TokenDocument changes, we may need to update its Actor instance */
        protected _onUpdateBaseActor(update?: Record<string, unknown>): void;

        /** When the Actor data overrides change for an un-linked Token Actor, simulate the post-update process. */
        protected _onUpdateTokenActor(
            data: Record<string, unknown>,
            options: DocumentModificationContext,
            userId: string,
        ): void;

        /** Get an Array of attribute choices which could be tracked for Actors in the Combat Tracker */
        static getTrackedAttributes(data: Record<string, unknown>, _path: string[]): TokenAttributes;

        /** Inspect the Actor data model and identify the set of attributes which could be used for a Token Bar */
        static getTrackedAttributeChoices(attributes: TokenAttributes): TokenAttributes;
    }

    interface TokenDocument {
        readonly data: foundry.data.TokenData<TokenDocument>;
        readonly parent: foundry.documents.BaseScene | null;
        // readonly _sheet: TokenConfig<this> | null;
    }

    namespace TokenDocument {
        function _canUpdate(
            user: foundry.documents.BaseUser,
            doc: TokenDocument,
            data: foundry.data.TokenData,
        ): boolean;
    }

    interface TokenAttributes {
        bar: string[];
        value: number[];
    }
}
