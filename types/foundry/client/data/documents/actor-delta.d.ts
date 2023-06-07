export {};

declare global {
    /**
     * The client-side ActorDelta embedded document which extends the common BaseActorDelta document model.
     * @see {@link TokenDocument}  The TokenDocument document type which contains ActorDelta embedded documents.
     * @todo Fill in
     */

    class ActorDelta<TParent extends TokenDocument<Scene | null> | null> extends foundry.documents
        .BaseActorDelta<TParent> {
        syntheticActor: Actor<TParent>;
    }
}
