import { CompendiumIndexData } from "@client/documents/collections/compendium-collection.mjs";
import User from "@client/documents/user.mjs";
import {
    DatabaseBackend,
    DatabaseCreateOperation,
    DatabaseDeleteOperation,
    DatabaseGetOperation,
    DatabaseUpdateOperation,
    Document,
} from "@common/abstract/_module.mjs";
import BaseUser from "@common/documents/user.mjs";

/**
 * The client-side database backend implementation which handles Document modification operations.
 */
export default class ClientDatabaseBackend extends DatabaseBackend {
    /* -------------------------------------------- */
    /*  Get Operations                              */
    /* -------------------------------------------- */

    protected override _getDocuments<TDocument extends Document>(
        documentClass: AbstractConstructorOf<TDocument>,
        operation: DatabaseGetOperation<TDocument["parent"]>,
        user?: User,
    ): Promise<TDocument[]>;
    protected override _getDocuments<TDocument extends Document>(
        documentClass: AbstractConstructorOf<TDocument>,
        operation: DatabaseGetOperation<TDocument["parent"]>,
        user?: BaseUser,
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Create Operations                           */
    /* -------------------------------------------- */

    protected override _createDocuments<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseCreateOperation<TDocument["parent"]>,
        user: User,
    ): Promise<(CompendiumIndexData | TDocument)[]>;

    /* -------------------------------------------- */
    /*  Update Operations                           */
    /* -------------------------------------------- */

    protected override _updateDocuments<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseUpdateOperation<TDocument["parent"]>,
        user: User,
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Delete Operations                           */
    /* -------------------------------------------- */

    protected override _deleteDocuments<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseDeleteOperation<TDocument["parent"]>,
        user: User,
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Socket Workflows                            */
    /* -------------------------------------------- */

    /**
     * Activate the Socket event listeners used to receive responses from events which modify database documents
     * @param socket The active game socket
     * @internal
     */
    activateSocketListeners(socket: io.Socket): void;

    /* -------------------------------------------- */
    /*  Helper Methods                              */
    /* -------------------------------------------- */

    override getFlagScopes(): string[];

    override getCompendiumScopes(): string[];

    protected override _log(level: string, message: string): void;
}
