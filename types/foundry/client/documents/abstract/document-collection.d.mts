import { ApplicationRenderOptions } from "@client/applications/_types.mjs";
import ApplicationV2 from "@client/applications/api/application.mjs";
import Application, { AppV1RenderOptions } from "@client/appv1/api/application-v1.mjs";
import {
    DatabaseAction,
    DatabaseCreateOperation,
    DatabaseOperation,
    DatabaseUpdateOperation,
    Document,
} from "@common/abstract/_module.mjs";
import Collection from "@common/utils/collection.mjs";
import User from "../user.mjs";

/**
 * A Collection of Document objects within the Foundry Virtual Tabletop framework.
 */
export default abstract class DocumentCollection<TDocument extends Document> extends Collection<string, TDocument> {
    /**
     * @param data An array of data objects from which to create document instances
     */
    constructor(data: TDocument["_source"]);

    /** An Array of application references which will be automatically updated when the collection content changes */
    apps: (ApplicationV2 | Application)[];

    /* -------------------------------------------- */
    /*  Collection Properties                       */
    /* -------------------------------------------- */

    /** The Collection class name */
    get name(): string;

    /** A reference to the Document class definition which is contained within this DocumentCollection. */
    get documentClass(): DocumentConstructorOf<TDocument>;

    /** A reference to the named Document class which is contained within this DocumentCollection. */
    abstract get documentName(): TDocument["documentName"] | null;

    /** The base Document type which is contained within this DocumentCollection */
    static documentName: string;

    /* -------------------------------------------- */
    /*  Collection Methods                          */
    /* -------------------------------------------- */

    override set(id: string, document: TDocument): this;

    /** Render any Applications associated with this DocumentCollection. */
    render(force: boolean, options?: AppV1RenderOptions | ApplicationRenderOptions): void;

    /* -------------------------------------------- */
    /*  Database Operations                         */
    /* -------------------------------------------- */

    /**
     * Update all objects in this DocumentCollection with a provided transformation.
     * Conditionally filter to only apply to Entities which match a certain condition.
     * @param transformation An object of data or function to apply to all matched objects
     * @param condition      A function which tests whether to target each object
     * @param [options]      Additional options passed to Entity.update
     * @return An array of updated data once the operation is complete
     */
    updateAll(
        transformation: Record<string, unknown> | ((document: TDocument) => Record<string, unknown>),
        condition?: ((document: TDocument) => boolean) | null,
        options?: DatabaseCreateOperation<null>,
    ): Promise<TDocument[]>;

    /**
     * Preliminary actions taken before a set of Documents in this Collection are created.
     * @param result  An Array of created data objects
     * @param options Options which modified the creation operation
     * @param userId  The ID of the User who triggered the operation
     */
    protected _preCreateDocuments(
        result: TDocument["_source"][],
        options: DatabaseCreateOperation<null>,
        userId: string,
    ): void;

    /**
     * Follow-up actions taken after a set of Documents in this Collection are created.
     * @param documents An Array of created Documents
     * @param result    An Array of created data objects
     * @param options   Options which modified the creation operation
     * @param userId    The ID of the User who triggered the operation
     */
    protected _onCreateDocuments(
        documents: TDocument[],
        result: TDocument["_source"][],
        options: DatabaseCreateOperation<null>,
        userId: string,
    ): void;

    /**
     * Preliminary actions taken before a set of Documents in this Collection are updated.
     * @param result  An Array of incremental data objects
     * @param options Options which modified the update operation
     * @param userId  The ID of the User who triggered the operation
     */
    protected _preUpdateDocuments(
        result: TDocument["_source"][],
        options: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    /**
     * Follow-up actions taken after a set of Documents in this Collection are updated.
     * @param documents An Array of updated Documents
     * @param result    An Array of incremental data objects
     * @param options   Options which modified the update operation
     * @param userId    The ID of the User who triggered the operation
     */
    protected _onUpdateDocuments(
        documents: TDocument[],
        result: TDocument["_source"][],
        options: DatabaseUpdateOperation<null>,
        userId: string,
    ): void;

    /**
     * Preliminary actions taken before a set of Documents in this Collection are deleted.
     * @param result  An Array of document IDs being deleted
     * @param options Options which modified the deletion operation
     * @param userId  The ID of the User who triggered the operation
     */
    protected _preDeleteDocuments(
        result: TDocument["_source"][],
        options: DatabaseCreateOperation<null>,
        userId: string,
    ): void;

    /**
     * Follow-up actions taken after a set of Documents in this Collection are deleted.
     * @param documents An Array of deleted Documents
     * @param result    An Array of document IDs being deleted
     * @param options   Options which modified the deletion operation
     * @param userId    The ID of the User who triggered the operation
     */
    protected _onDeleteDocuments(
        documents: TDocument[],
        result: string[],
        options: DatabaseCreateOperation<null>,
        userId: string,
    ): void;

    /**
     * Follow-up actions to take when a database operation modifies Documents in this DocumentCollection.
     * @param action The database action performed
     * @param documents The array of modified Documents
     * @param result The result of the database operation
     * @param operation Database operation details
     * @param user The User who performed the operation
     * @internal
     */
    _onModifyContents(
        action: DatabaseAction,
        documents: TDocument[],
        result: unknown[],
        operation: DatabaseOperation<null>,
        user: User,
    ): void;
}
