export {};

declare global {
    class SocketInterface {
        /**
         * Standardize the way that socket messages are dispatched and their results are handled
         * @param eventName The socket event name being handled
         * @param request Data provided to the Socket event
         * @return A Promise which resolves to the SocketResponse
         */
        static dispatch(eventName: string, request: SocketRequest): Promise<SocketResponse>;

        /**
         * Handle an error returned from the database, displaying it on screen and in the console
         * @param err The provided Error message
         */
        protected static _handleError(err: Error): Error;
    }
}
