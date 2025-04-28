import { SocketResponse } from "@common/_types.mjs";
import { DatabaseAction, DatabaseOperation, DocumentSocketRequest } from "./_types.mjs";
import Document from "./document.mjs";

/**
 * The data structure of a modifyDocument socket response.
 */
export default class DocumentSocketResponse {
    /**
     * Prepare a response for an incoming request.
     * @param request The incoming request that is being responded to
     */
    constructor(request: DocumentSocketRequest | SocketResponse);

    /** The type of Document being transacted. */
    type: string;

    /** The database action that was performed. */
    action: DatabaseAction;

    /** Was this response broadcast to other connected clients? */
    broadcast: boolean;

    /** The database operation that was requested. */
    operation: DatabaseOperation<Document | null>;

    /** The identifier of the requesting user. */
    userId: string;

    /** The result of the request. Present if successful */
    result: object[] | string[];

    /** An error that occurred. Present if unsuccessful */
    error: Error | undefined;
}
