/**
 * A class or interface that provide support for WebGL async read pixel/texture data extraction.
 */
export default class TextureExtractor {
    /**
     * @param renderer The renderer
     * @param config Worker initialization options
     * @param config.format      The texture format
     * @param config.controlHash Should use control hash?
     * @param config.callerName  The caller name
     */
    constructor(
        renderer: PIXI.Renderer,
        config?: { format?: PIXI.FORMATS; controlHash?: boolean; callerName?: string; debug?: boolean },
    );

    /**
     * List of compression that could be applied with extraction
     */
    static COMPRESSION_MODES: {
        NONE: 0;
        BASE64: 1;
    };

    /**
     * The WebGL2 renderer.
     */
    get renderer(): PIXI.Renderer;
    /**
     * The texture format on which the Texture Extractor must work.
     */
    get format(): PIXI.FORMATS;

    /**
     * The texture type on which the Texture Extractor must work.
     */
    get type(): PIXI.TYPES;

    /**
     * Debug flag.
     */
    debug: boolean;

    /* -------------------------------------------- */
    /*  TextureExtractor Synchronization            */
    /* -------------------------------------------- */

    /**
     * Extract a rectangular block of pixels from the texture (without un-pre-multiplying).
     * @param options Options which configure pixels extraction behavior
     * @returns The pixels or undefined if there's no change compared to the last time pixels were extracted and the
     *          control hash option is enabled. If an output buffer was passed, the (new) output buffer is included in
     *          the result, which may be different from the output buffer that was passed because it was detached.
     */
    extract(
        options?: TexturePixelsExtractionOptions,
    ): { pixels: Uint8ClampedArray | undefined; width: number; height: number; out?: ArrayBuffer } | undefined;
    /**
     *
     * @param options Options which configure base64 extraction behavior
     * @returns The base64 string or undefined if there's no change compared to the last time base64 was extracted and
     *          the control hash option is enabled.
     */
    extract(options?: TextureBase64ExtractionOptions): string | undefined;

    /* -------------------------------------------- */
    /*  TextureExtractor Methods/Interface          */
    /* -------------------------------------------- */

    /**
     * Free all the bound objects.
     */
    reset(): void;

    /**
     * Called by the renderer contextChange runner.
     */
    contextChange(): void;
}

interface TextureBase64ExtractionOptions {
    /** The texture the pixels are extracted from. */
    texture?: PIXI.Texture | PIXI.RenderTexture;
    /** The rectangle which the pixels are extracted from. */
    frame?: PIXI.Rectangle;
    /** The BASE64 compression mode. */
    compression: 1;
    /** The optional image mime type. Default: `"image/png"`. */
    type?: string;
    /** The optional image quality. Default: `1`. */
    quality?: number;
}

interface TexturePixelsExtractionOptions {
    /** The texture the pixels are extracted from. */
    texture?: PIXI.Texture | PIXI.RenderTexture;
    /** The rectangle which the pixels are extracted from. */
    frame?: PIXI.Rectangle;
    /** The NONE compression mode. */
    compression?: 0;
    /** The optional output buffer to write the pixels to. May be detached. The (new) output buffer is returned. */
    out?: ArrayBuffer;
}
