import type { Socket } from "socket.io";

/** The client-side database backend implementation which handles Document modification operations. */
declare global {
    class ClientDatabaseBackend<TDocument extends ClientDocument> extends foundry.abstract.DatabaseBackend<TDocument> {
        /* -------------------------------------------- */
        /*  Document Modification Operations            */
        /* -------------------------------------------- */

        protected override _getDocuments(
            documentClass: ConstructorOf<TDocument>,
            request: DatabaseBackendGetContext,
            user: User
        ): Promise<(DeepPartial<TDocument["_source"][]> & CompendiumIndexData) | TDocument[]>;

        protected override _createDocuments(
            documentClass: ConstructorOf<TDocument>,
            context: DatabaseBackendCreateContext<TDocument>,
            user: User
        ): Promise<TDocument[]>;

        protected override _updateDocuments(
            documentClass: ConstructorOf<TDocument>,
            context: DatabaseBackendUpdateContext<TDocument>,
            user: User
        ): Promise<TDocument[]>;

        protected override _deleteDocuments(
            documentClass: ConstructorOf<TDocument>,
            context: DatabaseBackendDeleteContext,
            user: User
        ): Promise<TDocument[]>;

        /* -------------------------------------------- */
        /*  Socket Workflows                            */
        /* -------------------------------------------- */

        /** Activate the Socket event listeners used to receive responses from events which modify database documents */
        activateSocketListeners(socket: Socket): void;

        /* -------------------------------------------- */
        /*  Helper Methods                              */
        /* -------------------------------------------- */

        override getFlagScopes(): string[];

        override getCompendiumScopes(): string[];
    }
}
