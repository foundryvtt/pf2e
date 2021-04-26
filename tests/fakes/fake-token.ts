import { ActorPF2e } from '@actor/base';

export class FakeToken {
    actor: ActorPF2e | null;

    constructor(public data: TokenData, public scene: Scene) {
        this.data = duplicate(data);
        this.scene = scene;
        this.actor = (Actor.fromToken((this as unknown) as Token) as unknown) as ActorPF2e;
    }

    get id() {
        return this.data._id;
    }

    get name() {
        return this.data.name;
    }

    update(changes: EmbeddedEntityUpdateData, options: EntityUpdateOptions = {}) {
        changes['_id'] = this.id;
        this.scene.updateEmbeddedEntity('Token', changes, options);
    }
}
