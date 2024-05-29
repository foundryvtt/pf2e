import type { Socket } from "socket.io";
import type {
    DatabaseCreateOperation,
    DatabaseGetOperation,
    DatabaseUpdateOperation,
} from "../../../common/abstract/_types.d.ts";
import type * as abstract from "../../../common/abstract/module.d.ts";

/** The client-side database backend implementation which handles Document modification operations. */
export declare class ClientDatabaseBackend extends abstract.DatabaseBackend {
    /* -------------------------------------------- */
    /*  Document Modification Operations            */
    /* -------------------------------------------- */

    protected override _getDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseGetOperation<abstract.Document | null>,
        user?: User,
    ): Promise<CompendiumIndexData[] | abstract.Document[]>;

    protected override _createDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseCreateOperation<abstract.Document | null>,
        user?: User,
    ): Promise<ClientDocument[]>;

    protected override _updateDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseUpdateOperation<abstract.Document | null>,
        user?: User,
    ): Promise<abstract.Document[]>;

    protected override _deleteDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseCreateOperation<abstract.Document | null>,
        user?: User,
    ): Promise<abstract.Document[]>;

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
