import type * as TinyMCE from "tinymce";

declare global {
    /**
     * An abstract pattern for defining an Application responsible for updating some object using an HTML form
     *
     * A few critical assumptions:
     * 1) This application is used to only edit one object at a time
     * 2) The template used contains one (and only one) HTML <form> as it's outer-most element
     * 3) This abstract layer has no knowledge of what is being updated, so the implementation must define _updateObject
     *
     * @param object    Some object or entity which is the target to be updated.
     *
     * @param options   Additional options which modify the rendering of the sheet.
     */
    abstract class FormApplication<
        TObject extends object = object,
        TOptions extends FormApplicationOptions = FormApplicationOptions,
    > extends Application<TOptions> {
        constructor(object?: TObject, options?: Partial<TOptions>);

        override options: TOptions;

        /**
         * The object target which we are using this form to modify
         */
        object: TObject;

        /** A convenience reference to the form HTLMElement */
        form: HTMLFormElement;

        /**
         * Keep track of any FilePicker instances which are associated with this form
         * The values of this Array are inner-objects with references to the FilePicker instances and other metadata
         */
        filepickers: FilePicker[];

        /**
         * Keep track of any mce editors which may be active as part of this form
         * The values of this Array are inner-objects with references to the MCE editor and other metadata
         */
        editors: Record<string, TinyMCEEditorData>;

        // Undocumented
        _submitting?: boolean;

        /** Assign the default options which are supported by the entity edit sheet */
        static override get defaultOptions(): FormApplicationOptions;

        /** Is the Form Application currently editable? */
        get isEditable(): boolean;

        getData(options?: Partial<TOptions>): FormApplicationData<TObject> | Promise<FormApplicationData<TObject>>;

        protected override _render(force?: boolean, options?: RenderOptions): Promise<void>;

        protected override _renderInner(data: FormApplicationData<TObject>, options: RenderOptions): Promise<JQuery>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        /**
         * Activate the default set of listeners for the Entity sheet
         * These listeners handle basic stuff like form submission or updating images
         *
         * @param html The rendered template ready to have listeners attached
         */
        override activateListeners(html: JQuery): void;

        /**
         * If the form is not editable, disable its input fields
         * @param form The form HTML
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
        protected _onSubmit(event: Event, options?: OnSubmitFormOptions): Promise<Record<string, unknown> | false>;

        /**
         * Get an object of update data used to update the form's target object
         * @param updateData Additional data that should be merged with the form data
         * @return The prepared update data
         */
        protected _getSubmitData(updateData?: Record<string, unknown>): Record<string, unknown>;

        /**
         * Handle changes to an input element, submitting the form if options.submitOnChange is true.
         * Do not preventDefault in this handler as other interactions on the form may also be occurring.
         * @param event The initial change event
         */
        protected _onChangeInput(event: Event): Promise<void>;

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
        protected abstract _updateObject(event: Event, formData: Record<string, unknown>): Promise<unknown>;

        /* -------------------------------------------- */
        /*  TinyMCE Editor                              */
        /* -------------------------------------------- */

        /**
         * Activate a named TinyMCE text editor
         * @param name           The named data field which the editor modifies.
         * @param options        TinyMCE initialization options passed to TextEditor.create
         * @param initialContent Initial text content for the editor area.
         */
        activateEditor(
            name: string,
            options?: EditorCreateOptions,
            initialContent?: string,
        ): Promise<TinyMCE.Editor | ProseMirror.EditorView>;

        /**
         * Handle saving the content of a specific editor by name
         * @param name     The named editor to save
         * @param [remove] Remove the editor after saving its content
         * @param [preventRender] Prevent normal re-rendering of the sheet after saving
         */
        saveEditor(
            name: string,
            { remove, preventRender }?: { remove?: boolean; preventRender?: boolean },
        ): Promise<void>;

        /** Activate a TinyMCE editor instance present within the form */
        protected _activateEditor(div: JQuery | HTMLElement): void;

        /**
         * Configure ProseMirror plugins for this sheet.
         * @param name                   The name of the editor.
         * @param [options]              Additional options to configure the plugins.
         * @param [options.remove=true]  Whether the editor should destroy itself on save.
         */
        protected _configureProseMirrorPlugins(
            name: string,
            options?: { remove?: boolean },
        ): Record<string, ProseMirror.Plugin>;

        /** Activate a FilePicker instance present within the form */
        protected _activateFilePicker(button: JQuery | HTMLElement): void;

        /**
         * Determine the configuration options used to initialize a FilePicker instance within this FormApplication.
         * Subclasses can extend this method to customize the behavior of pickers within their form.
         * @param event The initiating mouse click event which opens the picker
         * @returns Options passed to the FilePicker constructor
         */
        protected _getFilePickerOptions(event: PointerEvent): FilePickerOptions;

        /**
         * Submit the contents of a Form Application, processing its content as defined by the Application
         * @param [options] Options passed to the _onSubmit event handler
         * @returns Return a self-reference for convenient method chaining
         */
        submit(options?: OnSubmitFormOptions): Promise<this>;

        override close(options?: { force?: boolean }): Promise<void>;
    }

    class FormDataExtended extends FormData {
        constructor(form: HTMLElement, options?: { editors?: Record<string, TinyMCEEditorData>; dtypes?: string[] });

        /** The object representation of the form data, available once processed. */
        readonly object: Record<string, unknown>;

        /**
         * Process the HTML form element to populate the FormData instance.
         * @param form The HTML form
         */
        process(form: HTMLFormElement): void;
    }

    interface FormApplicationData<O extends object = object> {
        object?: O | object;
        options?: Partial<FormApplicationOptions>;
        title?: string;
    }

    interface OnSubmitFormOptions {
        updateData?: Record<string, unknown> | null;
        preventClose?: boolean;
        preventRender?: boolean;
    }

    interface FormApplicationOptions extends ApplicationOptions {
        /**
         * Whether the application form is editable - if true, it's fields will
         * be unlocked and the form can be submitted. If false, all form fields
         * will be disabled and the form cannot be submitted. Default is true.
         */
        editable: boolean;

        /**
         * Whether to automatically close the application when it's contained
         * form is submitted. Default is true.
         */
        closeOnSubmit: boolean;

        /**
         * Whether to automatically submit the contained HTML form when the
         * application window is manually closed. Default is false.
         */
        submitOnClose: boolean;

        /**
         * Whether to automatically submit the contained HTML form when an input
         * or select element is changed. Default is false.
         */
        submitOnChange: boolean;
    }

    interface TinyMCEEditorData {
        active: boolean;
        button: HTMLElement;
        changed: boolean;
        hasButton: boolean;
        initial: string;
        mce: TinyMCE.Editor | null;
        options: Partial<TinyMCE.EditorOptions>;
        target: string;
    }

    /** A simple implementation of the FormApplication pattern which is specialized in editing Entity instances */
    class DocumentSheet<
        TDocument extends foundry.abstract.Document = foundry.abstract.Document,
        TOptions extends DocumentSheetOptions = DocumentSheetOptions,
    > extends FormApplication<TDocument, TOptions> {
        constructor(object: TDocument, options?: Partial<TOptions>);

        static override get defaultOptions(): DocumentSheetOptions;

        /** A convenience accessor for the object property of the inherited FormApplication instance */
        get document(): TDocument;

        override get id(): string;

        override get isEditable(): boolean;

        override get title(): string;

        override close(options?: { force?: boolean | undefined }): Promise<void>;

        override getData(
            options?: Partial<TOptions>,
        ): DocumentSheetData<TDocument> | Promise<DocumentSheetData<TDocument>>;

        protected override _activateCoreListeners(html: JQuery): void;

        override activateEditor(
            name: string,
            options?: EditorCreateOptions,
            initialContent?: string,
        ): Promise<TinyMCE.Editor | ProseMirror.EditorView>;

        override render(force?: boolean, options?: RenderOptions): this;

        protected override _renderOuter(options: RenderOptions): Promise<JQuery>;

        /** Create an ID link button in the document sheet header which displays the document ID and copies to clipboard */
        protected _createDocumentIdLink(html: JQuery): void;

        /**
         * Test whether a certain User has permission to view this Document Sheet.
         * @param user The user requesting to render the sheet
         * @returns Does the User have permission to view this sheet?
         */
        protected _canUserView(user: User): boolean;

        /** Create objects for managing the functionality of secret blocks within this Document's content. */
        protected _createSecretHandlers(): HTMLSecret[];

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        protected override _getHeaderButtons(): ApplicationHeaderButton[];

        /**
         * Get the HTML content that a given secret block is embedded in.
         * @param secret The secret block.
         */
        protected _getSecretContent(secret: HTMLElement): string;

        /**
         * Update the HTML content that a given secret block is embedded in.
         * @param secret  The secret block.
         * @param content The new content.
         * @returns The updated Document.
         */
        protected _updateSecret(secret: HTMLElement, content: string): Promise<TDocument>;

        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
    }

    interface DocumentSheetOptions extends FormApplicationOptions {
        classes: string[];
        template: string;
        viewPermission: number;
        sheetConfig: boolean;
    }

    interface DocumentSheetData<TDocument extends foundry.abstract.Document = foundry.abstract.Document> {
        cssClass: string;
        editable: boolean;
        document: TDocument;
        data: object;
        limited: boolean;
        options: Partial<DocumentSheetOptions>;
        owner: boolean;
        title: string;
    }
}
