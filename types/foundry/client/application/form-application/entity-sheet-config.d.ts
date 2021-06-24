declare interface EntitySheetConfigData {
    entityName: string;
    isGM: boolean;
    object: foundry.abstract.DocumentData;
    options: FormApplicationOptions;
    sheetClass: string;
    sheetClasses: Record<string, string>;
    defaultClass: string;
    blankLabel: string;
}

declare interface RegisterSheetOptions {
    label?: string;
    types?: string[];
    makeDefault?: boolean;
}

/**
 * Entity Sheet Configuration Application
 * @param entity  The Entity object for which the sheet is being configured
 * @param options Additional Application options
 */
declare class EntitySheetConfig extends FormApplication<foundry.abstract.DocumentData> {
    /** @override */
    static get defaultOptions(): FormApplicationOptions;

    /**
     * Add the Entity name into the window title
     * @override
     */
    get title(): string;

    /** @override */
    getData(options: {}): EntitySheetConfigData;

    /**
     * This method is called upon form submission after form data is validated
     * @param event    The initial triggering submission event
     * @param formData The object of validated form data with which to update the object
     */
    protected _updateObject(event: Event, formData: FormApplicationData): Promise<void>;

    /* -------------------------------------------- */
    /*  Configuration Methods
    /* -------------------------------------------- */

    /**
     * Initialize the configured Sheet preferences for Entities which support dynamic Sheet assignment
     * Create the configuration structure for supported entities
     * Process any pending sheet registrations
     * Update the default values from settings data
     */
    static initializeSheets(): void;

    /**
     * Register a sheet class as a candidate which can be used to display entities of a given type
     * @param entityClass The Entity for which to register a new Sheet option
     * @param scope       Provide a unique namespace scope for this sheet
     * @param sheetClass  A defined Application class used to render the sheet
     * @param options     Additional options used for sheet registration
     * @param [options.label]       A human readable label for the sheet name, which will be localized
     * @param [options.types]       An array of entity types for which this sheet should be used
     * @param [options.makeDefault] Whether to make this sheet the default for provided types
     */
    static registerSheet(
        entityClass: typeof foundry.abstract.Document,
        scope: string,
        sheetClass: typeof DocumentSheet,
        { label, types, makeDefault }?: RegisterSheetOptions,
    ): void;
}
