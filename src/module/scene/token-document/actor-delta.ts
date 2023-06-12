import { ActorSystemSource } from "@actor/data/base.ts";
import { ItemPF2e } from "@item";
import { TokenDocumentPF2e } from "./document.ts";

class ActorDeltaPF2e<TParent extends TokenDocumentPF2e | null> extends ActorDelta<TParent> {
    override _initialize(options?: Record<string, unknown>): void {
        // Do absolutely nothing if the parent token is linked
        if (!this.parent?.isLinked) {
            super._initialize(options);
            // If it is unlinked, ensure the synthetic actor performs full data reinitialization
            // https://github.com/foundryvtt/foundryvtt/issues/9465
            if (game.ready) this.syntheticActor?.reset();
        }
    }

    // Upstream calls _initialize: reset after to ensure clean data
    override prepareData(): void {
        super.prepareData();
        if (!game.ready && !this.parent?.isLinked) {
            this.syntheticActor?.reset();
        }
    }

    /** Prevent data preparation of embedded documents shared with linked actor */
    override prepareEmbeddedDocuments(): void {
        if (!this.parent?.isLinked) {
            super.prepareEmbeddedDocuments();
        }
    }

    /** Following synthetic actor  updates, send the `Token` a fake update notification to trigger redraws */
    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);

        if (changed.system?.traits?.size && this.parent?.rendered) {
            this.parent.object?._onUpdate(
                { width: this.parent.width },
                { ...options, parent: this.parent.scene },
                userId
            );
        }
    }

    /** Following synthetic actor item updates, send the `Token` a fake update notification to trigger redraws */
    override _dispatchDescendantDocumentEvents(
        event: string,
        collection: string,
        args: [object[], ...unknown[]],
        parent: ClientDocument | undefined
    ): void {
        super._dispatchDescendantDocumentEvents(event, collection, args, parent);

        const isPostWriteCallback = ["onCreate", "onUpdate", "onDelete"].includes(event);
        if (!this.parent || this.parent.isLinked || !this.parent.rendered || !isPostWriteCallback) {
            return;
        }

        const items = (args[0] ?? []).filter((i): i is ItemPF2e => i instanceof ItemPF2e);
        const nameChanged = items.some((i) => i.system.rules.some((r) => r.key === "TokenName"));
        const sizeChanged = items.some((i) => i.system.rules.some((r) => r.key === "CreatureSize"));
        const textureChanged = items.some((i) => i.system.rules.some((r) => r.key === "TokenImage"));
        const lightChanged = items.some((i) => i.system.rules.some((r) => r.key === "TokenLight"));
        const somethingChanged = nameChanged || sizeChanged || textureChanged || lightChanged;
        if (somethingChanged) {
            this.parent.reset();
            const fakeUpdates: Partial<foundry.documents.TokenSource> = {};
            if (nameChanged) fakeUpdates.name = this.parent.name;
            if (sizeChanged) fakeUpdates.width = this.parent.width;
            if (textureChanged) fakeUpdates.texture = deepClone(this.parent._source.texture);
            if (lightChanged) fakeUpdates.light = deepClone(this.parent._source.light);
            this.parent.object?._onUpdate(fakeUpdates, { parent: this.parent.scene }, game.user.id);
        }
    }
}

interface ActorDeltaPF2e<TParent extends TokenDocumentPF2e | null> extends ActorDelta<TParent> {
    _source: {
        name: string | null;
        system: ActorSystemSource;
    };
}

export { ActorDeltaPF2e };
