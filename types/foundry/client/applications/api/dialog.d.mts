import User from "@client/documents/user.mjs";
import { ApplicationConfiguration, ApplicationRenderOptions } from "../_types.mjs";
import ApplicationV2 from "./application.mjs";

export default class DialogV2<
    TConfig extends DialogV2Configuration = DialogV2Configuration,
    TRenderOptions extends ApplicationRenderOptions = ApplicationRenderOptions,
> extends ApplicationV2<TConfig, TRenderOptions> {
    static override DEFAULT_OPTIONS: DeepPartial<DialogV2Configuration>;

    protected override _initializeApplicationOptions(options: DeepPartial<TConfig>): TConfig;

    protected override _renderHTML(): Promise<HTMLFormElement>;

    /**
     * Render configured buttons
     * @returns
     */
    protected _renderButtons(): string;

    /**
     * Handle submitting the dialog
     * @param target The button that was clicked or the default button
     * @param event The triggering event
     */
    protected _onSubmit(target: HTMLButtonElement, event: PointerEvent | SubmitEvent): Promise<DialogV2>;

    protected override _onFirstRender(): Promise<void>;

    protected override _attachFrameListeners(): void;

    protected override _replaceHTML(result: unknown, content: HTMLFormElement): void;

    /**
     * Handle keypresses within the dialog
     * @param event The triggering event
     */
    protected _onKeyDown(event: KeyboardEvent): void;

    /**
     * @param event The originating click event.
     * @param target The button element that was clicked
     */
    protected static _onClickButton(event: PointerEvent, target: HTMLButtonElement): void;

    /**
     * A utility helper to generate a dialog with yes and no buttons.
     * @param [yes] Options to overwrite the default yes button configuration.
     * @param [no]  Options to overwrite the default no button configuration.
     * @returns     Resolves to true if the yes button was pressed, or false if the
     *              no button was pressed. If additional buttons were provided, the Promise
     *              resolves to the identifier of the one that was pressed, or the value
     *              returned by its callback. If the dialog was dismissed, and rejectClose is
     *              false, the Promise resolves to null.
     */
    static confirm({
        yes,
        no,
        ...options
    }: {
        yes?: Partial<DialogV2Button>;
        no?: Partial<DialogV2Button>;
    } & DeepPartial<DialogV2Configuration> &
        Partial<DialogV2WaitOptions>): Promise<boolean | null>;

    /**
     * A utility helper to generate a dialog with a single confirmation button.
     * @param [ok] Options to overwrite the default confirmation button configuration.
     * @returns    Resolves to the identifier of the button used to submit the dialog,
     *             or the value returned by that button's callback. If the dialog was
     *             dismissed, and rejectClose is false, the Promise resolves to null.
     */
    static prompt({
        ok,
        ...config
    }: { ok?: Partial<DialogV2Button> } & DeepPartial<DialogV2Configuration> &
        Partial<DialogV2WaitOptions>): Promise<unknown>;

    /**
     * A utility helper to generate a dialog for user input.
     * @param [ok]   Options to overwrite the default confirmation button configuration.
     * @returns     Resolves to the data of the form if the ok button was pressed,
     *              or the value returned by that button's callback. If additional
     *              buttons were provided, the Promise resolves to the identifier of
     *              the one that was pressed, or the value returned by its callback.
     *              If the dialog was dismissed, and rejectClose is false, the Promise
     *              resolves to null.
     */
    static input<T>({
        ok,
        ...config
    }: { ok?: Partial<DialogV2Button<T>> } & DeepPartial<DialogV2Configuration> &
        Partial<DialogV2WaitOptions>): Promise<T | null>;

    /**
     * Spawn a dialog and wait for it to be dismissed or submitted.
     * @returns Resolves to the identifier of the button used to submit the dialog, or the value returned by that
     *          button's callback. If the dialog was dismissed, and rejectClose is false, the Promise resolves to
     *          null.
     */
    static wait({
        rejectClose,
        close,
        render,
        renderOptions,
        ...options
    }: DeepPartial<DialogV2Configuration> & Partial<DialogV2WaitOptions>): Promise<unknown>;

    /**
     * Present an asynchronous Dialog query to a specific User for response.
     * @param user A User instance or a User id
     * @param type The type of Dialog to present
     * @param config Dialog configuration forwarded on to the Dialog.prompt, Dialog.confirm, Dialog.input, or
     *               Dialog.wait function depending on the query type. Callback options are not supported.
     * @returns The query response or null if no response was provided
     *
     * @see {@link DialogV2.prompt}
     * @see {@link DialogV2.confirm}
     * @see {@link DialogV2.input}
     * @see {@link DialogV2.wait}
     */
    static query(user: User | string, type: "prompt" | "confirm" | "input" | "wait", config?: object): Promise<unknown>;

    /**
     * The dialog query handler.
     * @internal
     */
    static _handleQuery: (options: { type: "prompt" | "confirm" | "input" | "wait"; config: object }) => unknown;
}

export interface DialogV2Button<T = unknown> {
    /** The button action identifier. */
    action: string;

    /** The button label. Will be localized. */
    label: string;

    /** FontAwesome icon classes. */
    icon?: string;

    /** CSS classes to apply to the button. */
    class?: string;

    /** CSS style to apply to the button. */
    style?: Record<string, string>;

    /** The button type. */
    type?: string;

    /** Whether the button is disabled. */
    disabled?: boolean;

    /** The tooltip of the button. */
    tooltip?: string;

    /** Whether this button is autofocused */
    default?: boolean;

    /**
     * A function to invoke when the button is clicked. The value returned from this function will be used as the
     * dialog's submitted value. Otherwise, the button's identifier is used.
     */
    callback?: DialogV2ButtonCallback<T>;
}

export interface DialogV2Configuration extends ApplicationConfiguration {
    /** Modal dialogs prevent interaction with the rest of the UI until they are dismissed or submitted. */
    modal?: boolean;

    /** Button configuration. */
    buttons: DialogV2Button[];

    /**
     * The dialog content: a HTML string or a <div> element. If string,
     *     the content is cleaned with {@link foundry.utils.cleanHTML}.
     *     Otherwise, the content is not cleaned.
     */
    content?: string | HTMLDivElement;

    /**
     * A function to invoke when the dialog is submitted. This will not be
     *     called if the dialog is dismissed.
     */
    submit?: DialogV2SubmitCallback;
}

export interface DialogV2WaitOptions {
    /** A synchronous function to invoke whenever the dialog is rendered. */
    render?: DialogV2RenderCallback;

    /** A synchronous function to invoke when the dialog is closed under any circumstances. */
    close?: DialogV2CloseCallback;

    /** Throw a Promise rejection if the dialog is dismissed. */
    rejectClose?: boolean;

    /** Options forwarded to the dialog's render call. */
    renderOptions?: ApplicationRenderOptions;
}

/**
 * @param event The button click event, or a form submission event if the dialog was submitted via keyboard.
 * @param button If the form was submitted via keyboard, this will be the default button, otherwise the button that
 *               was clicked.
 * @param dialog The DialogV2 instance.
 */
export type DialogV2ButtonCallback<T = unknown> = (
    event: PointerEvent | SubmitEvent,
    button: HTMLButtonElement,
    dialog: DialogV2,
) => Promise<T> | T;

/**
 * @param event The render event.
 * @param dialog The DialogV2 instance.
 */
export type DialogV2RenderCallback = (event: Event, dialog: DialogV2) => void;

/**
 * @param event The close event.
 * @param dialog The DialogV2 instance.
 */
export type DialogV2CloseCallback = (event: Event, dialog: DialogV2) => void;

/**
 * @param result Either the identifier of the button that was clicked to submit the dialog, or the result returned by
 *               that button's callback.
 * @param dialog The DialogV2 instance.
 */
export type DialogV2SubmitCallback = (result: unknown, dialog: DialogV2) => Promise<void>;
