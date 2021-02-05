declare class FormDataExtended extends FormData {
    constructor(form: HTMLElement, options?: { editors?: any[], dtypes?: any[] });

    toObject(): any;
}

declare interface FormApplicationData<O extends {} = {}> {
    object: O;
    options?: FormApplicationOptions;
    title: string;
}

declare interface OnSubmitFormOptions {
    updateData?: Record<string, unknown> | null;
    preventClose?: boolean
    preventRender?: boolean;
}


declare interface FormApplicationOptions extends ApplicationOptions {
    /**
     * Whether the application form is editable - if true, it's fields will
     * be unlocked and the form can be submitted. If false, all form fields
     * will be disabled and the form cannot be submitted. Default is true.
     */
    editable?: boolean;
    /**
     * Whether to automatically close the application when it's contained
     * form is submitted. Default is true.
     */
    closeOnSubmit?: boolean;
    /**
     * Whether to automatically submit the contained HTML form when the
     * application window is manually closed. Default is false.
     */
    submitOnClose?: boolean;
    /**
     * Whether to automatically submit the contained HTML form when an input
     * or select element is changed. Default is false.
     */
    submitOnChange?: boolean;
}

/**
 * An abstract pattern for defining an Application responsible for updating some object using an HTML form
 *
 * A few critical assumptions:
 * 1) This application is used to only edit one object at a time
 * 2) The template used contains one (and only one) HTML <form> as it's outer-most element
 * 3) This abstract layer has no knowledge of what is being updated, so the implementation must define _updateObject
 *
 * @param object	Some object or entity which is the target to be updated.
 *
 * @param options	Additional options which modify the rendering of the sheet.
 */
declare abstract class FormApplication<ObjectType extends {} = {}> extends Application {
    options: FormApplicationOptions;

    /**
     * The object target which we are using this form to modify
     */
    object: ObjectType;

    /** A convenience reference to the form HTLMElement */
    form: HTMLFormElement;

    /**
     * Keep track of any FilePicker instances which are associated with this form
     * The values of this Array are inner-objects with references to the FilePicker instances and other metadata
     */
    filepickers: any[];

    /**
     * Keep track of any mce editors which may be active as part of this form
     * The values of this Array are inner-objects with references to the MCE editor and other metadata
     */
    editors: Record<string, unknown>[];

    constructor(object: ObjectType, options?: FormApplicationOptions);

    /**
     * Assign the default options which are supported by the entity edit sheet
     */
    static get defaultOptions(): FormApplicationOptions;

    /**
     * Is the Form Application currently editable?
     */
    get isEditable(): boolean;

    /** @override */
    getData(options?: FormApplicationOptions): FormApplicationData<ObjectType>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Activate the default set of listeners for the Entity sheet
     * These listeners handle basic stuff like form submission or updating images
     *
     * @param html The rendered template ready to have listeners attached
     */
    protected activateListeners(html: JQuery): void;

    /**
     * If the form is not editable, disable its input fields
     */
    protected _disableFields(form: HTMLElement): void;

    /**
     * Handle standard form submission steps
     * @param event           The submit event which triggered this handler
     * @param [updateData]    Additional specific data keys/values which override or extend the contents of
     *                        the parsed form. This can be used to update other flags or data fields at the
     *                        same time as processing a form submission to avoid multiple database operations.
     * @param [preventClose]  Override the standard behavior of whether to close the form on submit
     * @param [preventRender] Prevent the application from re-rendering as a result of form submission
     * @returns A promise which resolves to the validated update data
     */
    protected _onSubmit(
        event: Event,
        { updateData, preventClose, preventRender }?: OnSubmitFormOptions
    ): Promise<Record<string, unknown>>;

    /**
     * Get an object of update data used to update the form's target object
     * @param updateData Additional data that should be merged with the form data
     * @return The prepared update data
     */
    protected _getSubmitData(updateData?: Record<string, unknown>): Record<string, unknown>;

    /**
     * Handle unfocusing an input on form - maybe trigger an update if ``options.liveUpdate`` has been set to true
     * @param event The initial triggering event
     */
    protected _onUnfocus(event: Event | JQuery.Event): void;

    /**
     * This method is called upon form submission after form data is validated
     * @param event     The initial triggering submission event
     * @param formData  The object of validated form data with which to update the object
     * @returns         A Promise which resolves once the update operation has completed
     */
    protected abstract _updateObject(event: Event, formData: {}): Promise<void>;

    /* -------------------------------------------- */
    /*  TinyMCE Editor
    /* -------------------------------------------- */

    /**
     * Activate a TinyMCE editor instance present within the form
     */
    protected _activateEditor(div: JQuery | HTMLElement): void;

    /**
     * By default, when the editor is saved treat it as a form submission event
     */
    protected _onEditorSave(target: any, element: JQuery | HTMLElement, content: string): void;

    /**
     * Activate a FilePicker instance present within the form
     */
    protected _activateFilePicker(button: JQuery | HTMLElement): void;

    /**
     * Extend the logic applied when the application is closed to destroy any remaining MCE instances
     * This function returns a Promise which resolves once the window closing animation concludes
     */
    close(): Promise<void>;

    /**
     * Submit the contents of a Form Application, processing its content as defined by the Application
     * @param updateData	Additional data updates to submit in addition to those parsed from the form
     * @returns				Return a self-reference for convenient method chaining
     */
    submit({ updateData }: { updateData?: any }): FormApplication;
}
