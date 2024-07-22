import type { ClientBaseActorDelta } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side ActorDelta embedded document which extends the common BaseActorDelta document model.
     * @see {@link TokenDocument}  The TokenDocument document type which contains ActorDelta embedded documents.
     * @todo Fill in
     */

    class ActorDelta<TParent extends TokenDocument | null> extends ClientBaseActorDelta<TParent> {
        syntheticActor?: NonNullable<NonNullable<TParent>["actor"]> | undefined;

        protected override _configure(options?: { pack?: string | null; parentCollection?: string | null }): void;

        protected override _initialize({
            sceneReset,
            ...options
        }?: {
            sceneReset?: boolean;
            options?: Record<string, unknown>;
        }): void;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Apply this ActorDelta to the base Actor and return a synthetic Actor.
         * @param {object} [context]  Context to supply to synthetic Actor instantiation.
         * @returns {Actor|null}
         */
        apply(context?: Record<string, unknown>): NonNullable<TParent>["baseActor"];

        override prepareEmbeddedDocuments(): void;

        override updateSource(
            changes?: Record<string, unknown> | undefined,
            options?: DocumentSourceUpdateContext,
        ): DeepPartial<this["_source"]>;

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

        /**
         * Restore this delta to empty, inheriting all its properties from the base actor.
         * @returns The restored synthetic Actor.
         */
        restore(): Promise<Actor<TParent>>;

        /**
         * Ensure that the embedded collection delta is managing any entries that have had their descendants updated.
         * @param doc  The parent whose immediate children have been modified.
         * @internal
         */
        protected _handleDeltaCollectionUpdates(doc: foundry.abstract.Document): void;

        /* -------------------------------------------- */
        /*  Database Operations                         */
        /* -------------------------------------------- */

        protected override _preDelete(options: DatabaseDeleteOperation<TParent>, user: User): Promise<boolean | void>;

        protected override _onUpdate(
            data: DeepPartial<this["_source"]>,
            options: DatabaseUpdateOperation<TParent>,
            userId: string,
        ): void;

        protected override _onDelete(options: DatabaseDeleteOperation<TParent>, userId: string): void;

        protected override _dispatchDescendantDocumentEvents(
            event: string,
            collection: string,
            args: [object[], ...unknown[]],
            parent: ClientDocument | undefined,
        ): void;
    }
}
