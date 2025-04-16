import Document from "@common/abstract/document.mjs";
import { ApplicationConfiguration, ApplicationRenderContext } from "../_types.mjs";
import {
    ApplicationV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../api/_module.mjs";

interface ImagePopoutConfiguration extends ApplicationConfiguration {
    /** The URL to the image or video file */
    src: string;

    /** Caption text to display below the image. */
    caption: string;

    /** The UUID of some related {@link Document}. */
    uuid: string | null;

    /** Force showing or hiding the title. */
    showTitle: boolean;
}

interface ShareImageConfig {
    /** The image URL to share. */
    image: string;

    /** The image title. */
    title: string;

    /** The UUID of a {@link Document} related to the image, used to determine permission to see the image title. */
    uuid?: string;

    /**
     * If this is provided, the permissions of the related Document will be ignored and the title will be shown based on this parameter.
     */
    showTitle?: boolean;

    /** A list of user IDs to show the image to. */
    users?: string[];
}

/**
 * An Image Popout Application which features a single image in a lightbox style frame.
 * Furthermore, this application allows for sharing the display of an image with other connected players.
 *
 * @example Creating an Image Popout
 * ```js
 * // Construct the Application instance
 * const ip = new ImagePopout({
 *   src: "path/to/image.jpg",
 *   uuid: game.actors.getName("My Hero").uuid
 *   window: {title: "My Featured Image"}
 * });
 *
 * // Display the image popout
 * ip.render(true);
 *
 * // Share the image with other connected players
 * ip.shareImage();
 * ```
 */
export default class ImagePopout extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options: DeepPartial<ImagePopoutConfiguration>);

    static override DEFAULT_OPTIONS: DeepPartial<ImagePopoutConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override get title(): string;

    /**
     * Whether the application should display video content.
     */
    get isVideo(): boolean;

    /**
     * Share the displayed image with other connected Users
     */
    shareImage(options?: ShareImageConfig): void;

    protected override _initializeApplicationOptions(
        options: DeepPartial<ImagePopoutConfiguration>,
    ): ImagePopoutConfiguration;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext>;

    protected override _preFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    /* -------------------------------------------- */
    /*  Helper Methods                              */
    /* -------------------------------------------- */

    /**
     * Handle a received request to display an image.
     * @param config The image configuration data.
     * @internal
     */
    static _handleShareImage(config: ShareImageConfig): ImagePopout;
}
