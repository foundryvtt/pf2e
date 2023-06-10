import { TokenDocumentPF2e } from "./document.ts";

class ActorDeltaPF2e<TParent extends TokenDocumentPF2e | null> extends ActorDelta<TParent> {
    override prepareData(): void {
        super.prepareData();
        if (!game.ready && this.parent && !this.parent.isLinked) {
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
