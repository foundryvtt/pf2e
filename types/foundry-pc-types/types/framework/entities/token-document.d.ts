// @ts-nocheck

declare interface TokenDocumentMetadata extends DocumentMetadata {
    collection: 'tokens';
    embedded: Record<string, never>;
    hasSystemData: false;
    isEmbedded: true;
    label: 'DOCUMENT.Token';
    name: 'Token';
}

declare class TokenDocument extends foundry.abstract.Document {
    readonly _actor: Actor | null;

    get actor(): this['_actor'];

    get scene(): this['parent'];

    /** @override */
    static get metadata(): TokenDocumentMetadata;

    /** A convenient reference for whether this TokenDocument is linked to the Actor it represents, or is a synthetic copy */
    get isLinked(): this['data']['actorLink'];

    /**
     * Create a synthetic Actor using a provided Token instance
     * If the Token data is linked, return the true Actor entity
     * If the Token data is not linked, create a synthetic Actor using the Token's actorData override
     */
    getActor(): this['_actor'];
}

declare interface TokenDocument {
    readonly data: foundry.data.TokenData;
    readonly parent: Scene | null;
    readonly _sheet: TokenConfig<this> | null;
}
