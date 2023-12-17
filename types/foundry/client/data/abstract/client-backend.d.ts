import type { Socket } from "socket.io";
import type { DatabaseBackend, Document } from "../../../common/abstract/module.d.ts";

/** The client-side database backend implementation which handles Document modification operations. */
declare global {
    class ClientDatabaseBackend extends DatabaseBackend {
        /* -------------------------------------------- */
        /*  Document Modification Operations            */
        /* -------------------------------------------- */

        protected override _getDocuments(
            documentClass: typeof Document,
            request: DatabaseBackendGetContext,
            user: User,
        ): Promise<CompendiumIndexData[] | Document[]>;

        protected override _createDocuments(
            documentClass: typeof Document,
            context: DatabaseBackendCreateContext<Document>,
            user: User,
        ): Promise<ClientDocument[]>;

        protected override _updateDocuments(
            documentClass: typeof Document,
            context: DatabaseBackendUpdateContext<Document>,
            user: User,
        ): Promise<Document[]>;

        protected override _deleteDocuments(
            documentClass: typeof Document,
            context: DatabaseBackendDeleteContext,
            user: User,
        ): Promise<Document[]>;

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
