export {};

declare global {
    /**
     * An Image Popout Application which features a single image in a lightbox style frame.
     * This popout can also be used as a form, allowing the user to edit an image which is being used.
     * Furthermore, this application allows for sharing the display of an image with other connected players.
     * @param src The image URL.
     * @param [options] Application configuration options.
     * @example
     * // Construct the Application instance
     * const ip = new ImagePopout("path/to/image.jpg", {
     *   title: "My Featured Image",
     *   shareable: true,
     *   uuid: game.actors.getName("My Hero").uuid
     * });
     *
     * // Display the image popout
     * ip.render(true);
     *
     * // Share the image with other connected players
     * ip.share();
     */
    class ImagePopout<TDocument extends foundry.abstract.Document> extends FormApplication<
        TDocument,
        ImagePopoutOptions
    > {
        constructor(src: string, options?: Partial<ImagePopoutOptions>);

        static override get defaultOptions(): ImagePopoutOptions;

        override get title(): string;

        override getData(options?: Partial<ImagePopoutOptions>): Promise<{
            image: TDocument;
            options: Partial<ImagePopoutOptions>;
            title: string;
            showTitle: boolean;
        }>;

        /** Provide a reference to the Document referenced by this popout, if one exists */
        getRelatedObject(): Promise<TDocument | null>;

        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
    }

    interface ImagePopoutOptions extends FormApplicationOptions {
        template: string;
        classes: string[];
        editable: boolean;
        resizable: boolean;
        /** Can this image be shared with connected users? */
        shareable: boolean;
        /** The UUID of some related  */
        uuid: DocumentUUID | null;
    }
}
