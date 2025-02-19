import type { ApplicationConfiguration, ApplicationRenderOptions } from "../_types.d.ts";
import type ApplicationV2 from "./application.js";

export default abstract class DialogV2<
    TConfig extends DialogV2Configuration = DialogV2Configuration,
    TRenderOptions extends ApplicationRenderOptions = ApplicationRenderOptions,
> extends ApplicationV2<TConfig, TRenderOptions> {
    constructor(options?: DeepPartial<TConfig>);

    /**
     * Render configured buttons
     * @returns
     */
    protected _renderButtons(): string;

    /**
     * Handle submitting the dialog
     * @param target The button that was clicked or the default button
     * @param event The triggering event
     * @returns
     */
    protected _onSubmit(target: HTMLButtonElement, event: PointerEvent | SubmitEvent): Promise<DialogV2>;

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
        yes?: DialogV2Button;
        no?: DialogV2Button;
    } & Partial<DialogV2Configuration & DialogV2WaitOptions>): Promise<boolean>;

    /**
     * A utility helper to generate a dialog with a single confirmation button.
     * @param [ok] Options to overwrite the default confirmation button configuration.
     * @returns    Resolves to the identifier of the button used to submit the dialog,
     *             or the value returned by that button's callback. If the dialog was
     *             dismissed, and rejectClose is false, the Promise resolves to null.
     */
    static prompt({
        ok,
        ...options
    }: {
        ok: Partial<DialogV2Button>;
    } & Partial<DialogV2Configuration & DialogV2WaitOptions>): Promise<unknown>;

    /**
     * Spawn a dialog and wait for it to be dismissed or submitted.
     * @param [render]            A function to invoke whenever the dialog is rendered.
     * @param [close]             A function to invoke when the dialog is closed under any
     *                            circumstances.
     * @param [rejectClose=true] Throw a Promise rejection if the dialog is dismissed.
     * @returns                  Resolves to the identifier of the
     *                           button used to submit the dialog, or the value returned by that button's
     *                           callback. If the dialog was dismissed, and rejectClose is false, the
     *                           Promise resolves to null.
     */
    static wait({
        rejectClose,
        close,
        render,
        ...options
    }: {
        rejectClose: boolean;
        close: DialogV2CloseCallback;
        render: DialogV2RenderCallback;
    } & Partial<DialogV2Configuration>): Promise<unknown>;
}

export interface DialogV2Button {
    /** The button action identifier. */
    action: string;
    /** The button label. Will be localized. */
    label: string;
    /** FontAwesome icon classes. */
    icon?: string;
    /** CSS classes to apply to the button. */
    class?: string;
    /** Whether this button represents the default action to take if the user
     * submits the form without pressing a button, i.e. with an Enter keypress. */
    default?: boolean;
    /**
     * A function to invoke when the button is clicked. The value returned from
     * this function will be used as the dialog's submitted value.  Otherwise,
     * the button's identifier is used.
     */
    callback?: DialogV2ButtonCallback;
}

export interface DialogV2Configuration extends ApplicationConfiguration {
    /**
     * Modal dialogs prevent interaction with the rest of the UI until they are
     * dismissed or submitted.
     */
    modal?: boolean;
    /** Button configuration. */
    buttons: DialogV2Button[];
    /** The dialog content */
    content?: string; // The dialog content
    /** A function to invoke when the dialog is submitted. This will not be
     * called if the dialog is dismissed
     */
    submit?: DialogV2SubmitCallback;
}

export interface DialogV2WaitOptions {
    /**
     * A synchronous function to invoke whenever the dialog is rendered.
     */
    render?: DialogV2RenderCallback;
    /**
     * A synchronous function to invoke when the dialog is closed under any
     * circumstances.
     */
    close?: DialogV2CloseCallback;
    /** Throw a Promise rejection if the dialog is dismissed. */
    rejectClose?: boolean;
}

/**
 * A button click handler method.
 * @param event The button click event, or a form submission event if the dialog was
 * @param button If the form was submitted via keyboard, this will be the default
 * @param dialog The dialog element.
 */
export type DialogV2ButtonCallback = (
    event: PointerEvent | SubmitEvent,
    button: HTMLButtonElement,
    dialog: HTMLDialogElement,
) => Promise<unknown>;

/**
 * A dialog render handler method.
 * @param event The render event.
 * @param dialog The dialog element.
 */
export type DialogV2RenderCallback = (event: Event, dialog: HTMLDialogElement) => void;

/**
 * @param event The close event
 * @param dialog The dialog instance
 */
export type DialogV2CloseCallback = (event: Event, dialog: DialogV2) => void;

/**
 * @param result Either the identifier of the button that was clicked to submit
 * the dialog, or the result returned by that button's callback
 */
export type DialogV2SubmitCallback = (result: unknown) => Promise<void>;
