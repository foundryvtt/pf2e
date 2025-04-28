import { AudioBufferCacheEntry } from "./_types.mjs";

/**
 * A specialized cache used for audio buffers.
 * This is an LRU cache which expires buffers from the cache once the maximum cache size is exceeded.
 */
export default class AudioBufferCache extends Map<string, AudioBufferCacheEntry> {
    /**
     * Construct an AudioBufferCache providing a maximum disk size beyond which entries are expired.
     * @param cacheSize The maximum cache size in bytes. 1GB by default.
     */
    constructor(cacheSize?: number);

    /**
     * A string representation of the current cache utilization.
     */
    get usage(): {
        current: number;
        max: number;
        pct: number;
        currentString: string;
        maxString: string;
        pctString: string;
    };

    /* -------------------------------------------- */
    /*  Cache Methods                               */
    /* -------------------------------------------- */

    /**
     * Retrieve an AudioBuffer from the cache.
     * @param src The audio buffer source path
     * @returns The cached audio buffer, or undefined
     */
    getBuffer(src: string): AudioBuffer | undefined;
    /**
     * Insert an AudioBuffer into the buffers cache.
     * @param src The audio buffer source path
     * @param buffer The audio buffer to insert
     */
    setBuffer(src: string, buffer: AudioBuffer): this;

    /**
     * Delete an entry from the cache.
     * @param src The audio buffer source path
     * @returns Was the buffer deleted from the cache?
     */
    delete(src: string): boolean;

    /**
     * Lock a buffer, preventing it from being expired even if it is least-recently-used.
     * @param src The audio buffer source path
     * @param locked Lock the buffer, preventing its expiration?
     */
    lock(src: string, locked?: boolean): void;

    override toString(): string;
}
