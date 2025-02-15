import type {
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "../_types.d.ts";
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
    protected _onSubmit(
        target: HTMLButtonElement,
        event: PointerEvent | SubmitEvent,
    ): Promise<DialogV2>;

    /**
     * Handle keypresses within the dialog
     * @param event The triggering event
     */
    protected _onKeyDown(event: KeyboardEvent): void;

    /**
     * @param event The originating click event.
     * @param target The button element that was clicked
     */
    protected static _onClickButton(
        event: PointerEvent,
        target: HTMLButtonElement,
    ): void;

    static confirm({
        yes,
        no,
        ...options
    }: {
        yes?: DialogV2Button;
        no?: DialogV2Button;
    } & Partial<DialogV2Configuration & DialogV2WaitOptions>): Promise<boolean>;

    static prompt({
        ok,
        ...options
    }: {
        ok: Partial<DialogV2Button>;
    } & Partial<DialogV2Configuration & DialogV2WaitOptions>): Promise<any>;

    static wait({
        rejectClose,
        close,
        render,
        ...options
    }: {
        rejectClose: boolean;
        close: DialogV2CloseCallback;
        render: DialogV2RenderCallback;
    } & Partial<DialogV2Configuration>): Promise<any>;
}

export interface DialogV2Button {
    action: string;
    label: string; // Will be localized
    icon?: string; // FontAwesome icon classes
    class?: string; // CSS classes to apply to the button
    default?: boolean; // Whether this button represents the default action
    callback?: DialogV2ButtonCallback;
}

export interface DialogV2Configuration extends ApplicationConfiguration {
    modal?: boolean; // Modal dialogs prevent interaction with the rest of the UI
    buttons: DialogV2Button[]; // Button configuration
    content?: string; // The dialog content
    submit?: DialogV2SubmitCallback; // Function invoked when dialog is submitted
}

export interface DialogV2WaitOptions {
    render?: DialogV2RenderCallback; // Function invoked when dialog is rendered
    close?: DialogV2CloseCallback; // Function invoked when dialog is closed
    rejectClose?: boolean; // Whether to reject the Promise if the dialog is dismissed
}

export type DialogV2ButtonCallback = (
    event: PointerEvent | SubmitEvent,
    button: HTMLButtonElement,
    dialog: HTMLDialogElement,
) => Promise<any>;

export type DialogV2RenderCallback = (
    event: Event,
    dialog: HTMLDialogElement,
) => void;

export type DialogV2CloseCallback = (event: Event, dialog: DialogV2) => void;

export type DialogV2SubmitCallback = (result: any) => Promise<void>;
