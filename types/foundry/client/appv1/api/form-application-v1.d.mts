import { EditorCreateOptions } from "@client/applications/ux/prosemirror-editor.mjs";
import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Application, { AppV1RenderOptions, ApplicationV1Options } from "./application-v1.mjs";

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
 * @deprecated since v13
 */
export default abstract class FormApplication<
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

    protected override _render(force?: boolean, options?: AppV1RenderOptions): Promise<void>;

    protected override _renderInner(data: FormApplicationData<TObject>, options: AppV1RenderOptions): Promise<JQuery>;

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
    ): Promise<TinyMCE.Editor | EditorView>;

    /**
     * Handle saving the content of a specific editor by name
     * @param name     The named editor to save
     * @param [remove] Remove the editor after saving its content
     * @param [preventRender] Prevent normal re-rendering of the sheet after saving
     */
    saveEditor(name: string, { remove, preventRender }?: { remove?: boolean; preventRender?: boolean }): Promise<void>;

    /** Activate a TinyMCE editor instance present within the form */
    protected _activateEditor(div: JQuery | HTMLElement): void;

    /**
     * Configure ProseMirror plugins for this sheet.
     * @param name                   The name of the editor.
     * @param [options]              Additional options to configure the plugins.
     * @param [options.remove=true]  Whether the editor should destroy itself on save.
     */
    protected _configureProseMirrorPlugins(name: string, options?: { remove?: boolean }): Record<string, Plugin>;

    /**
     * Submit the contents of a Form Application, processing its content as defined by the Application
     * @param [options] Options passed to the _onSubmit event handler
     * @returns Return a self-reference for convenient method chaining
     */
    submit(options?: OnSubmitFormOptions): Promise<this>;

    override close(options?: { force?: boolean }): Promise<void>;
}

export interface FormApplicationData<O extends object = object> {
    object?: O | object;
    options?: Partial<FormApplicationOptions>;
    title?: string;
}

export interface OnSubmitFormOptions {
    updateData?: Record<string, unknown> | null;
    preventClose?: boolean;
    preventRender?: boolean;
}

export interface FormApplicationOptions extends ApplicationV1Options {
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

export interface TinyMCEEditorData {
    active: boolean;
    button: HTMLElement;
    changed: boolean;
    hasButton: boolean;
    initial: string;
    mce: TinyMCE.Editor | null;
    options: Partial<TinyMCE.EditorOptions>;
    target: string;
}
