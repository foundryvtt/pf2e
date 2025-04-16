import { CompendiumIndexData } from "@client/documents/collections/compendium-collection.mjs";
import BaseUser from "@common/documents/user.mjs";
import {
    DatabaseCreateOperation,
    DatabaseDeleteOperation,
    DatabaseGetOperation,
    DatabaseOperation,
    DatabaseUpdateOperation,
    Document,
} from "./_module.mjs";

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
    get<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseGetOperation<TDocument["parent"] | null>,
        user?: BaseUser,
    ): Promise<CompendiumIndexData[] | TDocument[]>;

    protected _getDocuments<TDocument extends Document>(
        documentClass: AbstractConstructorOf<TDocument>,
        operation: DatabaseGetOperation<TDocument["parent"]>,
        user: BaseUser,
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Create Operations                           */
    /* -------------------------------------------- */

    create<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseCreateOperation<TDocument["parent"]>,
        user: BaseUser,
    ): Promise<TDocument[]>;

    /**
     * Create Document instances using provided data and operation parameters.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the get operation
     * @param user          The requesting User
     * @returns An array of retrieved Document instances or index objects
     */
    protected abstract _createDocuments<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseCreateOperation<TDocument["parent"]>,
        user: BaseUser,
    ): Promise<(CompendiumIndexData | TDocument)[]>;

    /* -------------------------------------------- */
    /*  Update Operations                           */
    /* -------------------------------------------- */

    /**
     * Update Documents using provided data and context.
     * It is recommended to use {@link Document.updateDocuments} or {@link Document#update} rather than calling this
     * method directly.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the update operation
     * @param user          The requesting User
     * @returns An array of updated Document instances
     */
    update<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseUpdateOperation<TDocument["parent"]>,
        user: BaseUser,
    ): Promise<TDocument[]>;

    /**
     * Update Document instances using provided data and operation parameters.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the update operation
     * @param user          The requesting User
     * @returns An array of updated Document instances
     */
    protected abstract _updateDocuments<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseUpdateOperation<TDocument["parent"]>,
        user: BaseUser,
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Delete Operations                           */
    /* -------------------------------------------- */

    /**
     * Delete Documents using provided ids and context.
     * It is recommended to use {@link Document.deleteDocuments} or {@link Document#delete} rather than calling this
     * method directly.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the delete operation
     * @param user          The requesting User
     * @returns An array of deleted Document instances
     */
    delete<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseDeleteOperation<TDocument["parent"]>,
        user: BaseUser,
    ): Promise<TDocument[]>;

    /**
     * Delete Document instances using provided ids and operation parameters.
     * @param documentClass The Document class definition
     * @param operation     Parameters of the delete operation
     * @param [user]        The requesting User
     * @returns An array of deleted Document instances
     */
    protected abstract _deleteDocuments<TDocument extends Document>(
        documentClass: ConstructorOf<TDocument>,
        operation: DatabaseDeleteOperation<TDocument["parent"]>,
        user: BaseUser,
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Helper Methods                              */
    /* -------------------------------------------- */

    /**
     * Get the parent Document (if any) associated with a request context.
     * @param operation The requested database operation
     * @returns The parent Document, or null
     * @internal
     */
    protected _getParent(operation: DatabaseOperation<Document | null>): Promise<Document | null>;

    /**
     * Describe the scopes which are suitable as the namespace for a flag key
     */
    abstract getFlagScopes(): string[];

    /**
     * Describe the scopes which are suitable as the namespace for a flag key
     */
    abstract getCompendiumScopes(): string[];

    /**
     * Log a database operation for an embedded document, capturing the action taken and relevant IDs
     * @param action         The action performed
     * @param type           The document type
     * @param documents      The documents modified
     * @param options
     * @param options.level  The logging level
     * @param options.parent A parent document
     * @param options.pack   A compendium pack within which the operation occurred
     */
    protected _logOperation(
        action: string,
        type: string,
        documents: Document[],
        options?: { level?: string; parent?: Document; pack: string },
    ): void;

    /**
     * Construct a standardized error message given the context of an attempted operation
     */
    protected _logError(
        user: BaseUser,
        action: string,
        subject: string,
        options?: { parent: Document; pack?: string },
    ): string;

    protected abstract _log(level: string, message: string): void;
}
