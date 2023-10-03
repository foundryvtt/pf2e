import type BaseUser from "../documents/user.d.ts";

/**
 * An interface shared by both the client and server-side which defines how creation, update, and deletion operations are transacted.
 */
export default abstract class DatabaseBackend<TDocument extends foundry.abstract.Document> {
    /* -------------------------------------------- */
    /*  Get Operations                              */
    /* -------------------------------------------- */

    /**
     * Retrieve Documents based on provided query parameters
     * @param documentClass   The Document definition
     * @param context         Context for the requested operation
     * @param [user]          The requesting User
     * @returns               The created Document instances
     */
    get(
        documentClass: ConstructorOf<TDocument>,
        context: Partial<DatabaseBackendGetContext>,
        user?: BaseUser
    ): Promise<TDocument[]>;

    /** Get primary Document instances */
    protected abstract _getDocuments(
        documentClass: ConstructorOf<TDocument>,
        request: DatabaseBackendGetContext,
        user: BaseUser
    ): Promise<(DeepPartial<TDocument["_source"][]> & CompendiumIndexData) | TDocument[]>;

    /* -------------------------------------------- */
    /*  Create Operations                           */
    /* -------------------------------------------- */

    /**
     * Perform document creation operations
     * @param documentClass    The Document definition
     * @param context          Context for the requested operation
     * @param [user]           The requesting User
     * @returns                The created Document instances
     */
    create(
        documentClass: ConstructorOf<TDocument>,
        context: DatabaseBackendCreateContext<TDocument>,
        user?: User
    ): Promise<TDocument[]>;

    /** Create primary Document instances */
    protected abstract _createDocuments(
        documentClass: ConstructorOf<TDocument>,
        context: DatabaseBackendCreateContext<TDocument>,
        user: User
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Update Operations                           */
    /* -------------------------------------------- */

    /**
     * Perform document update operations
     * @param documentClass    The Document definition
     * @param context          Context for the requested operation
     * @param [user]           The requesting User
     * @returns                The updated Document instances
     */
    update(
        documentClass: ConstructorOf<TDocument>,
        context: DatabaseBackendUpdateContext<TDocument>,
        user?: User
    ): Promise<TDocument[]>;

    /** Update primary Document instances */
    protected abstract _updateDocuments(
        documentClass: ConstructorOf<TDocument>,
        context: DatabaseBackendUpdateContext<TDocument>,
        user: User
    ): Promise<TDocument[]>;

    /* -------------------------------------------- */
    /*  Delete Operations                           */
    /* -------------------------------------------- */

    /**
     * Perform document deletion operations
     * @param documentClass   The Document definition
     * @param context         Context for the requested operation
     * @param [user]          The requesting User
     * @returns               The deleted Document instances
     */
    delete(
        documentClass: ConstructorOf<TDocument>,
        context: DatabaseBackendDeleteContext,
        user: User
    ): Promise<TDocument>;

    /** Delete primary Document instances */
    protected abstract _deleteDocuments(
        documentClass: ConstructorOf<TDocument>,
        context: DatabaseBackendDeleteContext,
        user: User
    ): Promise<TDocument[]>;

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
        documents: foundry.abstract.Document[],
        options?: { level?: string; parent?: foundry.abstract.Document; pack: string }
    ): void;

    /** Construct a standardized error message given the context of an attempted operation */
    protected _logError(
        user: User,
        action: string,
        subject: string,
        options?: { parent: foundry.abstract.Document; pack?: string }
    ): string;
}

declare global {
    interface DatabaseBackendBaseContext {
        query?: Record<string, unknown>;
        options?: object;
        pack?: string;
    }

    interface DatabaseBackendGetContext extends DatabaseBackendBaseContext {
        options?: {
            broadcast?: boolean;
            index?: boolean;
            indexFields?: string[];
        };
    }

    interface DatabaseBackendCreateContext<TDocument extends foundry.abstract.Document>
        extends DatabaseBackendBaseContext {
        data?: DeepPartial<TDocument["_source"]>[];
        options?: {
            temporary?: boolean;
            renderSheet?: boolean;
            render?: boolean;
            noHook?: boolean;
        };
    }

    interface DatabaseBackendUpdateContext<TDocument extends foundry.abstract.Document>
        extends DatabaseBackendBaseContext {
        updates?: DeepPartial<TDocument["_source"]>[];
        options?: {
            diff?: boolean;
            render?: boolean;
        };
    }

    interface DatabaseBackendDeleteContext extends DatabaseBackendBaseContext {
        ids?: string[];
        options?: {
            render?: boolean;
        };
    }
}
