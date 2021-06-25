import { ActorPF2e } from '@actor/base';
import { TokenDocumentPF2e } from '@module/token-document';

export class FakeToken {
    _actor: ActorPF2e | null;
    parent: Scene | null;
    data: foundry.data.TokenData<TokenDocumentPF2e>;

    constructor(data: foundry.data.TokenSource, context: TokenDocumentConstructionContext<TokenDocumentPF2e> = {}) {
        this.data = duplicate(data) as foundry.data.TokenData<TokenDocumentPF2e>;
        this.parent = context.parent ?? null;
        this._actor = context.actor ?? null;
    }

    get actor() {
        return this._actor;
    }

    get scene() {
        return this.parent;
    }

    get id() {
        return this.data._id;
    }

    get name() {
        return this.data.name;
    }

    update(changes: EmbeddedDocumentUpdateData<TokenDocument>, context: DocumentModificationContext = {}) {
        changes['_id'] = this.id;
        this.scene?.updateEmbeddedDocuments('Token', [changes], context);
    }
}
