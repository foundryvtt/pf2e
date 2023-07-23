/**
 * The FilePicker application renders contents of the server-side public directory.
 * This app allows for navigating and uploading files to the public path.
 */
declare class FilePicker extends Application<FilePickerOptions> {
    /** The full requested path given by the user */
    request: string;

    /** The file sources which are available for browsing */
    sources: object;

    /** Track the active source tab which is being browsed */
    activeSource: string;

    /** The general file type which controls the set of extensions which will be accepted */
    type: string;

    /** The target HTML element this file picker is bound to */
    field: HTMLElement;

    /** A button which controls the display of the picker UI */
    button: HTMLElement;

    /** The current set of file extensions which are being filtered upon */
    extension: string[];

    constructor(options: FilePickerOptions);

    /** Record the last-browsed directory path so that re-opening a different FilePicker instance uses the same target */
    static LAST_BROWSED_DIRECTORY: string;

    /** Record the last-configured tile size which can automatically be applied to new FilePicker instances */
    static LAST_TILE_SIZE: number | null;

    /** Record the last-configured display mode so that re-opening a different FilePicker instance uses the same mode. */
    static LAST_DISPLAY_MODE: FilePickerDisplayMode;

    /** Enumerate the allowed FilePicker display modes */
    static DISPLAY_MODES: ["list", "thumbs", "tiles", "images"];

    /** Cache the names of S3 buckets which can be used */
    static S3_BUCKETS: string[] | null;

    /**
     * Given a current file path, determine the directory it belongs to
     * @param target    The currently requested target path
     * @return          An array of the inferred source and target path
     */
    protected _inferCurrentDirectory(target: string): [string, string];

    /**
     * Get the valid file extensions for a given named file picker type
     */
    protected _getExtensions(type: string): string[];

    /* -------------------------------------------- */
    /*  FilePicker Properties                       */
    /* -------------------------------------------- */

    /**
     * Return the source object for the currently active source
     */
    get source(): object;

    /**
     * Return the target directory for the currently active source
     */
    get target(): string;

    /**
     * Return a flag for whether the current user is able to upload file content
     */
    get canUpload(): boolean;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /**
     * Browse to a specific location for this FilePicker instance
     * @param target    The target within the currently active source location.
     * @param options   Browsing options
     */
    browse(target: string, options?: object): Promise<object>;

    /**
     * Browse files for a certain directory location
     * @param source    The source location in which to browse. See FilePicker#sources for details
     * @param target    The target within the source location
     *
     * @param options               Optional arguments
     * @param options.bucket        A bucket within which to search if using the S3 source
     * @param options.extensions    An Array of file extensions to filter on
     * @param options.wildcard      The requested dir represents a wildcard path
     *
     * @return  A Promise which resolves to the directories and files contained in the location
     */
    static browse(
        source: string,
        target: string,
        options?: { bucket?: string; extensions?: string[]; wildcard?: boolean }
    ): Promise<object>;

    /**
     * Dispatch a POST request to the server containing a directory path and a file to upload
     * @param source    The data source to which the file should be uploaded
     * @param path      The destination path
     * @param file      The File object to upload
     * @param options   Additional file upload options passed as form data
     */
    static upload(source: string, path: string, file: File, options: object): Promise<boolean>;

    /**
     * Create a subdirectory within a given source. The requested subdirectory path must not already exist.
     * @param {string} source     The source location in which to browse. See FilePicker#sources for details
     * @param {string} target     The target within the source location
     * @param {Object} options    Optional arguments which modify the request
     * @return {Promise<Object>}
     */
    static createDirectory(source: string, target: string, options: object): Promise<object>;

    /**
     * Handle a drop event to support dropping files onto the file picker and automatically uploading them
     */
    protected _onDrop(event: Event): Promise<void>;

    /**
     * Handle user submission of the address bar to request an explicit target
     * @param event The originating keydown event
     */
    protected _onRequestTarget(event: Event): void;

    /**
     * Handle file or folder selection within the file picker
     * @param event The originating click event
     */
    protected _onPick(event: Event): void;

    /**
     * Handle backwards navigation of the folder structure
     */
    protected _onBack(event: Event): void;

    protected _onChangeBucket(event: Event): void;

    /**
     * Handle a keyup event in the filter box to restrict the set of files shown in the FilePicker
     */
    protected _onFilterResults(event: Event): void;

    /**
     * Handle file picker form submission
     */
    protected _onSubmit(ev: Event): Promise<void>;

    /**
     * Handle file upload
     */
    protected _onUpload(ev: Event): Promise<void>;

    /* -------------------------------------------- */
    /*  Factory Methods
    /* -------------------------------------------- */

    /**
     * Bind the file picker to a new target field.
     * Assumes the user will provide a <button> HTMLElement which has the data-target and data-type attributes
     * The data-target attribute should provide the name of the input field which should receive the selected file
     * The data-type attribute is a string in ["image", "audio"] which sets the file extensions which will be accepted
     *
     * @param button    The button element
     */
    static fromButton(button: HTMLElement, options: object): FilePicker;
}

type FilePickerDisplayMode = (typeof FilePicker)["DISPLAY_MODES"][number];

declare interface FilePickerOptions extends ApplicationOptions {
    type?: "audio" | "image" | "video" | "imagevideo" | "folder" | "font" | "graphics" | "text" | "any";
    /** The current file path being modified, if any */
    current?: string;
    /** A current file source in "data", "public", or "s3" */
    activeSource?: "data" | "public" | "s3";
    /** A callback function to trigger once a file has been selected */
    callback?: Function;
    /** A flag which permits explicitly disallowing upload, true by default */
    allowUpdload?: boolean;
    /** An HTML form field that the result of this selection is applied to */
    field?: HTMLElement;
    /** An HTML button element which triggers the display of this picker */
    button?: HTMLButtonElement;
    /** The picker display mode in FilePicker.DISPLAY_MODES */
    displayMode?: FilePickerDisplayMode;
    /** Display the tile size configuration. */
    tileSize?: boolean;
}
