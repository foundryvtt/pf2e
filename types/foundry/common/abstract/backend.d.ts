import type * as abstract from "../abstract/module.d.ts";
import type BaseUser from "../documents/user.d.ts";
import type { DatabaseCreateOperation, DatabaseGetOperation, DatabaseUpdateOperation } from "./_types.d.ts";

/**
 * An interface shared by both the client and server-side which defines how creation, update, and deletion operations are transacted.
 */
export default abstract class DatabaseBackend {
    /* -------------------------------------------- */
    /*  Get Operations                              */
    /* -------------------------------------------- */

    /**
     * Retrieve Documents based on provided query parameters
     * @param documentClass The Document class definition
     * @param operation     Parameters of the get operation
     * @param [user]        The requesting User
     * @returns An array of retrieved Document instances or index objects
     */
    get(
        documentClass: typeof abstract.Document,
        operation: DatabaseGetOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<CompendiumIndexData[] | abstract.Document[]>;

    /**
     * Retrieve Document instances using the specified operation parameters.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the get operation
     * @param [user]        The requesting User
     * @returns An array of retrieved Document instances or index objects
     */
    protected abstract _getDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseGetOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<CompendiumIndexData[] | abstract.Document[]>;

    /* -------------------------------------------- */
    /*  Create Operations                           */
    /* -------------------------------------------- */

    create(
        documentClass: typeof abstract.Document,
        operation: DatabaseCreateOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<abstract.Document[]>;

    /**
     * Create Document instances using provided data and operation parameters.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the create operation
     * @param [user]        The requesting User
     * @returns An array of created Document instances
     */
    protected abstract _createDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseCreateOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<abstract.Document[]>;

    /** Create primary Document instances */
    protected abstract _createDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseCreateOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<abstract.Document[]>;

    /* -------------------------------------------- */
    /*  Update Operations                           */
    /* -------------------------------------------- */

    /**
     * Update Documents using provided data and context.
     * It is recommended to use {@link Document.updateDocuments} or {@link Document#update} rather than calling this
     * method directly.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the update operation
     * @param [user]        The requesting User
     * @returns An array of updated Document instances
     */
    update(
        documentClass: typeof abstract.Document,
        operation: DatabaseUpdateOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<abstract.Document[]>;

    /**
     * Update Document instances using provided data and operation parameters.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the update operation
     * @param [user]        The requesting User
     * @returns An array of updated Document instances
     */
    protected abstract _updateDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseUpdateOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<abstract.Document[]>;

    /* -------------------------------------------- */
    /*  Delete Operations                           */
    /* -------------------------------------------- */

    /**
     * Delete Documents using provided ids and context.
     * It is recommended to use {@link foundry.abstract.Document.deleteDocuments} or
     * {@link foundry.abstract.Document#delete} rather than calling this method directly.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the delete operation
     * @param [user]        The requesting User
     * @returns An array of deleted Document instances
     */
    delete(
        documentClass: typeof abstract.Document,
        operation: DatabaseCreateOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<abstract.Document[]>;

    /**
     * Delete Document instances using provided ids and operation parameters.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the delete operation
     * @param [user]        The requesting User
     * @returns An array of deleted Document instances
     */
    protected abstract _deleteDocuments(
        documentClass: typeof abstract.Document,
        operation: DatabaseCreateOperation<abstract.Document | null>,
        user?: BaseUser,
    ): Promise<abstract.Document[]>;

    /* -------------------------------------------- */
    /*  Helper Methods                              */
    /* -------------------------------------------- */

    /** Describe the scopes which are suitable as the namespace for a flag key */
    abstract getFlagScopes(): string[];

    /** Describe the scopes which are suitable as the namespace for a flag key */
    abstract getCompendiumScopes(): string[];

    /** Provide the Logger implementation that should be used for database operations */
    protected _getLogger(): Console;

    /**
     * Log a database operation for an embedded document, capturing the action taken and relevant IDs
     * @param action                 The action performed
     * @param type                   The document type
     * @param documents              The documents modified
     * @param [options]
     * @param [options.level=info]   The logging level
     * @param [options.parent]       A parent document
     * @param [options.pack]         A compendium pack within which the operation occurred
     */
    protected _logOperation(
        action: string,
        type: string,
        documents: abstract.Document[],
        options?: { level?: string; parent?: abstract.Document; pack: string },
    ): void;

    /** Construct a standardized error message given the context of an attempted operation */
    protected _logError(
        user: BaseUser,
        action: string,
        subject: string,
        options?: { parent: abstract.Document; pack?: string },
    ): string;
}
