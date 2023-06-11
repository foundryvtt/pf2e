import type { ClientBaseActorDelta } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side ActorDelta embedded document which extends the common BaseActorDelta document model.
     * @see {@link TokenDocument}  The TokenDocument document type which contains ActorDelta embedded documents.
     * @todo Fill in
     */

    class ActorDelta<TParent extends TokenDocument<Scene | null> | null> extends ClientBaseActorDelta<TParent> {
        syntheticActor?: Actor<TParent>;
    }
}
