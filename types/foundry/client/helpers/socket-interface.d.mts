import { SocketResponse } from "@common/_types.mjs";

/**
 * A standardized way socket messages are dispatched and their responses are handled
 */
export default class SocketInterface {
    /**
     * Send a socket request to all other clients and handle their responses.
     * @param eventName The socket event name being handled
     * @param request Request data provided to the Socket event
     * @returns A Promise which resolves to the SocketResponse
     */
    static dispatch(eventName: string, request: object): Promise<SocketResponse>;
}
