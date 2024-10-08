/**
 * A helper class to provide common functionality for working with Image objects
 */
declare class ImageHelper {
    /**
     * Create thumbnail preview for a provided image path.
     * @param src               The URL or display object of the texture to render to a thumbnail
     * @param options           Additional named options passed to the compositeCanvasTexture function
     * @param [options.width]   The desired width of the resulting thumbnail
     * @param [options.height]  The desired height of the resulting thumbnail
     * @param [options.tx]      A horizontal transformation to apply to the provided source
     * @param [options.ty]      A vertical transformation to apply to the provided source
     * @param [options.center]  Whether to center the object within the thumbnail
     * @param [options.format]  The desired output image format
     * @param [options.quality] The desired output image quality
     * @returns The parsed and converted thumbnail data
     */
    static async createThumbnail(
        src: string | PIXI.DisplayObject,
        options: {
            width?: number;
            height?: number;
            tx?: number;
            ty?: number;
            center?: boolean;
            format: string;
            quality: number;
        },
    ): Promise<object>;

    /**
     * Test whether a source file has a supported image extension type
     * @param src      A requested image source path
     * @returns       Does the filename end with a valid image extension?
     */
    static hasImageExtension(src: string): src is ImageFilePath;

    /**
     * Composite a canvas object by rendering it to a single texture
     *
     * @param object            The object to render to a texture
     * @param options           Options which configure the resulting texture
     * @param [options.width]   The desired width of the output texture
     * @param [options.height]  The desired height of the output texture
     * @param [options.tx]      A horizontal translation to apply to the object
     * @param [options.ty]      A vertical translation to apply to the object
     * @param [options.center]  Center the texture in the rendered frame?
     *
     * @returns The composite Texture object
     */
    static compositeCanvasTexture(
        object: PIXI.DisplayObject,
        options?: { width?: number; height?: number; tx?: number; ty?: number; center?: boolean },
    ): PIXI.Texture;

    /**
     * Extract a texture to a base64 PNG string
     * @param texture           The texture object to extract
     * @param options
     * @param [options.format]  Image format, e.g. "image/jpeg" or "image/webp".
     * @param [options.quality] JPEG or WEBP compression from 0 to 1. Default is 0.92.
     * @returns A base64 png string of the texture
     */
    static async textureToImage(texture: PIXI.Texture, options?: { format: string; quality: number }): Promise<string>;

    /**
     * Asynchronously convert a DisplayObject container to base64 using Canvas#toBlob and FileReader
     * @param target    A PIXI display object to convert
     * @param type      The requested mime type of the output, default is image/png
     * @param quality   A number between 0 and 1 for image quality if image/jpeg or image/webp
     * @returns A processed base64 string
     */
    static async pixiToBase64(target: PIXI.DisplayObject, type: string, quality: number): Promise<string>;

    /**
     * Asynchronously convert a canvas element to base64.
     * @param {HTMLCanvasElement} canvas
     * @param [type="image/png"]
     * @param quality
     * @returns The base64 string of the canvas.
     */
    static async canvasToBase64(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<string>;

    /**
     * Upload a base64 image string to a persisted data storage location
     * @param base64                    The base64 string
     * @param fileName                  The file name to upload
     * @param filePath                  The file path where the file should be uploaded
     * @param options                   Additional options which affect uploading
     * @param [options.storage=data]    The data storage location to which the file should be uploaded
     * @param [options.type]            The MIME type of the file being uploaded
     * @param [options.notify=true]     Display a UI notification when the upload is processed.
     * @returns A promise which resolves to the FilePicker upload response
     */
    static async uploadBase64(
        base64: string,
        fileName: string,
        filePath: string,
        options?: { storage?: string; type?: string; notify?: boolean },
    ): Promise<object>;

    /**
     * Create a canvas element containing the pixel data.
     * @param pixels            Buffer used to create the image data.
     * @param width             Buffered image width.
     * @param height            Buffered image height.
     * @param options
     * @param [options.element] The element to use.
     * @param [options.ew]      Specified width for the element (default to buffer image width).
     * @param [options.eh]      Specified height for the element (default to buffer image height).
     * @returns
     */
    static pixelsToCanvas(
        pixels: Uint8ClampedArray,
        width: number,
        height: number,
        options?: { element?: HTMLCanvasElement; ew?: number; eh?: number },
    ): HTMLCanvasElement;
}
