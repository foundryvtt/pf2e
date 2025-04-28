import Scene from "@client/documents/scene.mjs";
import { ImageFilePath } from "@common/constants.mjs";

/** A Loader class which helps with loading video and image textures. */
export default class TextureLoader {
    /** The duration in milliseconds for which a texture will remain cached */
    static CACHE_TTL: number;

    /** Initialize the basis transcoder for PIXI.Assets */
    static initializeBasisTranscoder(): Promise<unknown>;

    /**
     * Check if a source has a text file extension.
     * @param src The source.
     * @returns If the source has a text extension or not.
     */
    static hasTextExtension(src: string): boolean;

    /**
     * Use the texture to create a cached mapping of pixel alpha and cache it.
     * Cache the bounding box of non-transparent pixels for the un-rotated shape.
     * @param texture        The provided texture.
     * @param [resolution=1] Resolution of the texture data output.
     * @returns The texture data if the texture is valid, else undefined.
     */
    static getTextureAlphaData(texture: PIXI.Texture, resolution?: number): TextureAlphaData | undefined;

    /**
     * Load all the textures which are required for a particular Scene
     * @param scene The Scene to load
     * @param [options={}] Additional options that configure texture loading
     * @param [options.expireCache=true] Destroy other expired textures
     * @param [options.additionalSources=[]]       Additional sources to load during canvas initialize
     * @param [options.maxConcurrent]              The maximum number of textures that can be loaded concurrently
     */
    static loadSceneTextures(
        scene: Scene,
        options?: { expireCache?: boolean; additionalSources?: string[]; maxConcurrent?: number },
    ): Promise<void[]>;

    /**
     * Load an Array of provided source URL paths
     * @param sources The source URLs to load
     * @param [options={}] Additional options which modify loading
     * @param [options.message]           The status message to display in the load bar
     * @param [options.expireCache=false] Expire other cached textures?
     * @param [options.maxConcurrent]     The maximum number of textures that can be loaded concurrently.
     * @param [options.displayProgress]   Display loading progress bar
     * @returns A Promise which resolves once all textures are loaded
     */
    load(
        sources: string[],
        options?: { message?: string; expireCache?: boolean; maxConcurrent?: number; displayProgress?: boolean },
    ): Promise<void[]>;

    /**
     * Load a single texture or spritesheet on-demand from a given source URL path
     * @param src The source texture path to load
     * @returns The loaded texture object
     */
    loadTexture(src: string): Promise<PIXI.BaseTexture | PIXI.Spritesheet | null>;

    /**
     * Use the Fetch API to retrieve a resource and return a Blob instance for it.
     * @param src
     * @param [options]                   Options to configure the loading behaviour.
     * @param [options.bustCache=false]  Append a cache-busting query parameter to the request.
     * @returns A Blob containing the loaded data
     */
    static fetchResource(src: string, options?: { bustCache?: boolean }): Promise<Blob>;

    /* -------------------------------------------- */
    /*  Cache Controls                              */
    /* -------------------------------------------- */

    /**
     * Add an image or a sprite sheet url to the assets cache.
     * @param src   The source URL.
     * @param asset The asset
     */
    setCache(src: string, asset: PIXI.BaseTexture | PIXI.Spritesheet): void;

    /**
     * Retrieve a texture or a sprite sheet from the assets cache
     * @param src The source URL
     * @returns The cached texture, a sprite sheet or undefined
     */
    getCache(src: string): PIXI.BaseTexture | PIXI.Spritesheet | null;

    /**
     * Expire and unload assets from the cache which have not been used for more than CACHE_TTL milliseconds.
     */
    expireCache(): Promise<void>;

    /**
     * Return a URL with a cache-busting query parameter appended.
     * @param src The source URL being attempted
     * @returns The new URL, or false on a failure.
     */
    static getCacheBustURL(src: string): string | false;
}

export interface TextureAlphaData {
    /** The width of the (downscaled) texture. */
    width: number;
    /** The height of the (downscaled) texture. */
    height: number;
    /** The minimum x-coordinate with alpha > 0. */
    minX: number;
    /** The minimum y-coordinate with alpha > 0. */
    minY: number;
    /** The maximum x-coordinate with alpha > 0 plus 1. */
    maxX: number;
    /** The maximum y-coordinate with alpha > 0 plus 1. */
    maxY: number;
    /** The array containing the texture alpha values (0-255) with the dimensions (maxX-minX)×(maxY-minY). */
    data: Uint8Array;
}

/**
 * Test whether a file source exists by performing a HEAD request against it
 * @param src The source URL or path to test
 * @returns Does the file exist at the provided url?
 */
export function srcExists(src: string): Promise<boolean>;

/**
 * Get a single texture or sprite sheet from the cache.
 * @param src The texture path to load.
 *            This may be a standard texture path or a "virtual texture" beginning
 *            with the "#" character that is retrieved from canvas.sceneTextures.
 * @returns A texture, a sprite sheet or null if not found in cache.
 */
export function getTexture(src: string): PIXI.Texture | PIXI.Spritesheet | null;

/**
 * Load a single texture and return a Promise which resolves once the texture is ready to use
 * @param src      The requested texture source
 * @param fallback A fallback texture to use if the requested source is unavailable or invalid
 */
export function loadTexture(
    src: string,
    { fallback }?: { fallback?: ImageFilePath },
): Promise<PIXI.Texture | PIXI.Spritesheet | null>;
