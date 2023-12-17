/**
 * Load a single texture and return a Promise which resolves once the texture is ready to use
 * @param src       The requested texture source
 * @param fallback  A fallback texture to use if the requested source is unavailable or invalid
 */
declare function loadTexture(
    src: string,
    { fallback }?: { fallback?: ImageFilePath },
): Promise<PIXI.Texture | PIXI.Spritesheet | null>;
