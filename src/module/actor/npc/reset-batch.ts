import { ActorPF2e } from "@actor/base.ts";

/** A reset batcher that attempts to avoid duplicate resets in situations with possibly multiple overlapping resets */
export class ResetBatch {
    #actors: Set<ActorPF2e> = new Set();

    /** Adds the actor to the reset batch and makes a sync request */
    reset(actor: ActorPF2e): void {
        this.#actors.add(actor);
        this.#processSyncBatch();
    }

    #processSyncBatch = fu.debounce(() => {
        for (const actor of this.#actors) {
            actor.reset();
            actor.render();
        }
        this.#actors.clear();
    }, 10);
}
