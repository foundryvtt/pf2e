/**
 * A wrapper method around `fetch` that attaches an AbortController signal to the `fetch` call for clean timeouts
 * @see https://www.npmjs.com/package/node-fetch#request-cancellation-with-abortsignal
 * @param url  The URL to make the Request to
 * @param data The data of the Request
 * @param timeoutMs How long to wait for a Response before cleanly aborting. If null, no timeout is applied
 * @param onTimeout A method to invoke if and when the timeout is reached
 * @throws {HttpError}
 */
export function fetchWithTimeout(
    url: string,
    data?: RequestInit,
    options?: { timeoutMs?: number | null; onTimeout?: () => unknown | void },
): Promise<Response>;

/**
 * A small wrapper that automatically asks for JSON with a Timeout
 * @param url The URL to make the Request to
 * @param data The data of the Request
 * @param timeoutMs How long to wait for a Response before cleanly aborting
 * @param onTimeout A method to invoke if and when the timeout is reached
 */
export function fetchJsonWithTimeout(
    url: string,
    data?: RequestInit,
    options?: { timeoutMs?: number | null; onTimeout?: () => unknown | void },
): Promise<JSONValue>;

/**
 * Represents an HTTP Error when a non-OK response is returned by Fetch
 * @extends {Error}
 */
export class HttpError extends Error {
    constructor(statusText: string, code: number, displayMessage?: string);

    override toString(): string;
}
