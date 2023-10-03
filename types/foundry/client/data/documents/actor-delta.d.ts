import type { ClientBaseActorDelta } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side ActorDelta embedded document which extends the common BaseActorDelta document model.
     * @see {@link TokenDocument}  The TokenDocument document type which contains ActorDelta embedded documents.
     * @todo Fill in
     */

    class ActorDelta<TParent extends TokenDocument<Scene | null> | null> extends ClientBaseActorDelta<TParent> {
        syntheticActor?: NonNullable<NonNullable<TParent>["actor"]> | undefined;

        override prepareData(): void;

        override reset(): void;

        /**
         * Generate a synthetic Actor instance when constructed, or when the represented Actor, or actorLink status changes.
         * @param [options]
         * @param [options.reinitializeCollections]  Whether to fully re-initialize this ActorDelta's collections in
         *                                           order to re-retrieve embedded Documents from the synthetic Actor.
         * @internal
         */
        protected _createSyntheticActor(options?: { reinitializeCollections?: boolean }): void;

        /** Update the synthetic Actor instance with changes from the delta or the base Actor. */
        updateSyntheticActor(): void;

        restore(): Promise<Actor<TParent>>;

        _dispatchDescendantDocumentEvents(
            event: string,
            collection: string,
            args: [object[], ...unknown[]],
            parent: ClientDocument | undefined
        ): void;
    }
}
