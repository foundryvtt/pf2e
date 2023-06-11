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
}

export { ActorDeltaPF2e };
