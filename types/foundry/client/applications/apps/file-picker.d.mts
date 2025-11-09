import User from "@client/documents/user.mjs";
import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderContext,
    ApplicationTab,
    ApplicationTabsConfiguration,
    FormFooterButton,
} from "../_types.mjs";
import { HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/_module.mjs";
import ApplicationV2 from "../api/application.mjs";

export type FilePickerSource = "data" | "public" | "s3";

export type FilePickerFileType = (typeof FilePicker.FILE_TYPES)[number];

type FilerPickerDisplayMode = (typeof FilePicker.DISPLAY_MODES)[number];

export interface FilePickerConfiguration extends ApplicationConfiguration {
    /** A type of file to target. Default: `"any"` */
    type: FilePickerFileType;
    /** A current file source in "data", "public", or "s3". */
    activeSource: FilePickerSource;
    /** A callback function to trigger once a file has been selected */
    callback: Function;
    /** */
    current: string;
    /** A flag which permits explicitly disallowing upload, `true` by default */
    allowUpload: boolean;
    /** An HTML form field that the result of this selection is applied to */
    field: HTMLElement;
    /** An HTML button element which triggers the display of this picker */
    button: HTMLButtonElement;
    /**  */
    favorites: Record<string, FavoriteFolder>;
    /** The picker display mode in FilePicker.DISPLAY_MODES */
    displayMode: string;
    /** Display the tile size configuration. */
    tileSize: boolean;
    /** Redirect to the root directory rather than starting in the source directory of one of these files. */
    redirectToRoot: string[];
}

export interface FavoriteFolder {
    /** The source of the folder (e.g. "data", "public") */
    source: FilePickerSource;
    /** The full path to the folder */
    path: string;
    /** The label for the path */
    label: string;
}

interface FilePickerManageFilesResult {
    dirs: string[];
    extensions: string[];
    files: string[];
    gridSize: number | null;
    private: boolean;
    privateDirs: string[];
    target: string;
}

interface FilePickerUploadResponse {
    message: string;
    path: string;
    status: "success" | "error";
    error?: string;
}

interface FilePickerContext extends ApplicationRenderContext {
    rootId: string;
    bucket?: string | null;
    buckets: string[] | null;
    canGoBack: boolean;
    canCreateFolder: boolean;
    canUpload: boolean;
    canSelect: boolean;
    dirs: string[];
    displayMode: FilerPickerDisplayMode;
    extensions: string[];
    files: string[];
    isS3: boolean;
    noResults: boolean;
    selected: string;
    source: { target: string; bucket?: string; buckets?: string[] };
    sources: FilePicker["sources"];
    target: string;
    tileSize: number | null;
    user: User;
    favorites: Record<string, FavoriteFolder>;
    buttons: FormFooterButton[];
}

/**
 * The FilePicker application renders contents of the server-side public directory.
 * This app allows for navigating and uploading files to the public path.
 */
export default class FilePicker extends HandlebarsApplicationMixin(
    ApplicationV2<FilePickerConfiguration, HandlebarsRenderOptions, FilePickerContext>,
) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    static override TABS: Record<string, ApplicationTabsConfiguration>;

    /** The allowed values for the type of this FilePicker instance. */
    static FILE_TYPES: ["any", "audio", "folder", "font", "graphics", "image", "imagevideo", "text", "video"];

    /** Record the last-browsed directory path so that re-opening a different FilePicker instance uses the same target */
    static LAST_BROWSED_DIRECTORY: string;

    /** Record the last-configured tile size which can automatically be applied to new FilePicker instances */
    static LAST_TILE_SIZE: number | null;

    /** Record the last-configured display mode so that re-opening a different FilePicker instance uses the same mode. */
    static LAST_DISPLAY_MODE: FilerPickerDisplayMode;

    /** Enumerate the allowed FilePicker display modes */
    static DISPLAY_MODES: ["list", "thumbs", "tiles", "images"];

    /** Cache the names of S3 buckets which can be used */
    static S3_BUCKETS: string[] | null;

    /** Return the upload URL to which the FilePicker should post uploaded files */
    static get uploadURL(): string;

    /** Retrieve the configured FilePicker implementation. */
    static get implementation(): typeof FilePicker;

    /**
     *  @param [options={}] Options that configure the behavior of the FilePicker
     */
    constructor(options: FilePickerConfiguration);

    /** The full requested path given by the user */
    request: string;

    /**  A callback function to trigger once a file has been selected */
    callback: Function | null;

    /** The general file type which controls the set of extensions which will be accepted */
    type: FilePickerFileType;

    /** The target HTML element this file picker is bound to */
    field: HTMLElement | null;

    /** A button controlling the display of the picker UI */
    button: HTMLButtonElement | null;

    /** The display mode of the FilePicker UI */
    displayMode: FilerPickerDisplayMode;

    /** The file sources available for browsing */
    sources: Partial<Record<FilePickerSource, { target: string; bucket?: string; buckets?: string[] }>>;

    activeSource: FilePickerSource;

    /** The latest set of results browsed from the server */
    results: Record<string, unknown>;

    /** The current set of file extensions which are being filtered upon */
    extensions: string[];

    /** Get favorite folders for quick access */
    get favorites(): Record<string, FavoriteFolder>;

    override get title(): string;

    /** Return the source object for the currently active source */
    get source(): { target: string; bucket?: string; buckets?: string[] };

    /** Return the target directory for the currently active source */
    get target(): string;

    /** Whether the current user is able to create folders. */
    get canCreateFolder(): boolean;

    /** Whether the current use is able to upload file content. */
    get canUpload(): boolean;

    /**
     * Test a URL to see if it matches a well known s3 key pattern
     * @param url  An input URL to test
     * @returns    A regular expression match
     */
    static matchS3URL(url: string): RegExpMatchArray | null;

    /**
     * Browse files for a certain directory location
     * @param source                The source location in which to browse: see FilePicker#sources for details.
     * @param target                The target within the source location
     * @param options               Optional arguments
     * @param [options.bucket]      A bucket within which to search if using the S3 source
     * @param [options.extensions]  An Array of file extensions to filter on
     * @param [options.wildcard]    The requested dir represents a wildcard path
     *
     * @returns A Promise that resolves to the directories and files contained in the location
     */
    static browse(
        source: FilePickerSource,
        target: string,
        options?: { bucket?: string; extensions?: string[]; wildcard?: boolean },
    ): Promise<FilePickerManageFilesResult>;

    /**
     * Configure metadata settings regarding a certain file system path
     * @param source   The source location in which to browse: see FilePicker#sources for details.
     * @param target   The target within the source location
     * @param options  Optional arguments modifying the request
     */
    static configurePath(
        source: FilePickerSource,
        target: string,
        options?: object,
    ): Promise<FilePickerManageFilesResult>;

    /**
     * Create a subdirectory within a given source. The requested subdirectory path must not already exist.
     * @param source   The source location in which to browse. See FilePicker#sources for details
     * @param target   The target within the source location
     * @param options  Optional arguments which modify the request
     */
    static createDirectory(
        source: FilePickerSource,
        target: string,
        options?: object,
    ): Promise<FilePickerManageFilesResult>;

    /**
     * Dispatch a POST request to the server containing a directory path and a file to upload
     * @param source                 The data source to which the file should be uploaded
     * @param path                   The destination path
     * @param file                   The File object to upload
     * @param [body]                 Additional file upload options sent in the POST body
     * @param [options]              Additional options to configure how the method behaves
     * @param [options.notify=true]  Display a UI notification when the upload is processed
     * @returns  The response object
     */
    static upload(
        source: FilePickerSource,
        path: string,
        file: File,
        body?: Record<string, unknown>,
        options?: { notify?: boolean },
    ): Promise<FilePickerUploadResponse | false | void>;

    /**
     * A convenience function that uploads a file to a given package's persistent /storage/ directory
     * @param packageId              The id of the package to which the file should be uploaded. Only supports Systems and Modules.
     * @param path                   The relative destination path in the package's storage directory
     * @param file                   The File object to upload
     * @param [body={}]              Additional file upload options sent in the POST body
     * @param [options]              Additional options to configure how the method behaves
     * @param [options.notify=true]  Display a UI notification when the upload is processed
     * @returns  The response object
     */
    static uploadPersistent(
        packageId: string,
        path: string,
        file: File,
        body?: Record<string, unknown>,
        options?: { notify?: boolean },
    ): Promise<FilePickerUploadResponse | false | void>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Browse to a specific location for this FilePicker instance
     * @param [target]   The target within the currently active source location.
     * @param [options]  Browsing options
     */
    browse(
        target?: string,
        options?: {
            type?: FilePickerFileType;
            extensions?: string[];
            wildcard?: boolean;
            render?: boolean;
        },
    ): Promise<this>;

    override render(options?: Partial<HandlebarsRenderOptions>): Promise<this>;

    override _prepareContext(options: HandlebarsRenderOptions): Promise<FilePickerContext>;

    protected override _prepareTabs(group: string): Record<string, ApplicationTab>;

    override changeTab(
        tab: string,
        group: string,
        options?: { event?: Event; navElement?: HTMLElement; force?: boolean; updatePosition?: boolean },
    ): void;

    protected override _tearDown(options: ApplicationClosingOptions): void;

    protected override _onRender(context: FilePickerContext, options: HandlebarsRenderOptions): Promise<void>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle changes to the tile size.
     * @param event  The triggering event.
     */
    protected _onChangeTileSize(event: Event): void;

    /**
     * Search among shown directories and files.
     * @param event The triggering event
     * @param query The search input value
     * @param rgx
     * @param html
     */
    protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * Bind the file picker to a new target field.
     * Assumes the user will provide a HTMLButtonElement which has the data-target and data-type attributes
     * The data-target attribute should provide the name of the input field which should receive the selected file
     * The data-type attribute is a string in ["image", "audio"] which sets the file extensions which will be accepted
     *
     * @param button The button element
     */
    static fromButton(button: HTMLButtonElement): FilePicker;
}

export {};
