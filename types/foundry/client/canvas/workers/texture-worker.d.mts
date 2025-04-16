import { AsyncWorker, AsyncWorkerOptions } from "@client/helpers/workers.mjs";

/**
 * Wrapper for a web worker meant to convert a pixel buffer to the specified image format
 * and quality and return a base64 image.
 */
export default class TextureCompressor extends AsyncWorker {
    /**
     * @param name The worker name to be initialized
     * @param config.controlHash Should use control hash?
     */
    constructor(name?: string, config?: AsyncWorkerOptions & { controlHash?: boolean });

    /**
     * Process the non-blocking image compression to a base64 string.
     * @param buffer          Buffer used to create the image data.
     * @param width          Buffered image width.
     * @param height          Buffered image height.
     * @param options.type    The required image type.
     * @param options.quality The required image quality.
     * @param options.hash    The precomputed hash.
     * @param options.debug   The debug option.
     */
    compressBufferBase64(
        buffer: Uint8ClampedArray,
        width: number,
        height: number,
        options?: { type?: string; quality?: number; hash?: string; debug?: boolean },
    ): Promise<unknown>;

    /**
     * Expand a buffer in RED format to a buffer in RGBA format.
     * @param buffer        Buffer used to create the image data.
     * @param width         Buffered image width.
     * @param height        Buffered image height.
     * @param options.out   The output buffer to write the expanded pixels to. May be detached.
     * @param options.hash  The precomputed hash.
     * @param options.debug The debug option.
     */
    expandBufferRedToBufferRGBA(
        buffer: Uint8ClampedArray,
        width: number,
        height: number,
        options?: { out?: ArrayBuffer; hash?: string; debug?: boolean },
    ): Promise<unknown>;

    /**
     * Reduce a buffer in RGBA format to a buffer in RED format.
     * @param buffer        Buffer used to create the image data.
     * @param width         Buffered image width.
     * @param height        Buffered image height.
     * @param options.out   The output buffer to write the expanded pixels to. May be detached.
     * @param options.hash  The precomputed hash.
     * @param options.debug The debug option.
     */
    reduceBufferRGBAToBufferRED(
        buffer: Uint8ClampedArray,
        width: number,
        height: number,
        options?: { out?: ArrayBuffer; hash?: string; debug?: boolean },
    ): Promise<unknown>;

    /**
     * Copy a buffer.
     * @param buffer        Buffer used to create the image data.
     * @param width         Buffered image width.
     * @param height        Buffered image height.
     * @param options.out   The output buffer to write the expanded pixels to. May be detached.
     * @param options.hash  The precomputed hash.
     * @param options.debug The debug option.
     */
    copyBuffer(
        buffer: Uint8ClampedArray,
        width: number,
        height: number,
        options?: { out?: ArrayBuffer; hash?: string; debug?: boolean },
    ): Promise<unknown>;
}
