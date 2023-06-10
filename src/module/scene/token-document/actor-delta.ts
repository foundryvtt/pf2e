import { TokenDocumentPF2e } from "./document.ts";

class ActorDeltaPF2e<TParent extends TokenDocumentPF2e | null> extends ActorDelta<TParent> {
    override prepareData(): void {
        super.prepareData();
        if (!game.ready && !this.parent?.isLinked) this.syntheticActor?.reset();
    }
}

export { ActorDeltaPF2e };
