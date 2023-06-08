interface DialogData {
    title?: string;
    content?: string | HTMLElement | (() => string | HTMLElement);
    close?: (html: HTMLElement | JQuery) => void;
    buttons?: Record<string, DialogButton>;
    default?: string;
    render?: (html: HTMLElement | JQuery) => void;
}

interface DialogButton {
    icon?: string;
    label?: string;
    condition?: boolean;
    callback?: (html: JQuery) => void | Promise<void>;
}

interface ConfirmDialogParameters<Y = true, N = false> {
    title: string;
    content: string;
    yes?: (html: JQuery) => Y;
    no?: (html: JQuery) => N;
    render?: () => void | Promise<void>;
    defaultYes?: boolean;
    rejectClose?: () => void | Promise<void>;
    options?: ApplicationOptions;
}

/**
 * Create a modal dialog window displaying a title, a message, and a set of buttons which trigger callback functions.
 *
 * @param dialogData            An object of dialog data which configures how the modal window is rendered
 * @param dialogData.title      The window title
 * @param dialogData.content    HTML content
 * @param dialogData.close      Common callback operations to perform when the dialog is closed
 * @param dialogData.buttons    Action buttons which trigger callback functions.
 *                              Buttons are defined as an Object with the format ``{name: buttonData}``.
 *                              Valid keys for buttonData include:
 *
 * @param dialogData.buttons.button.icon        A button icon
 * @param dialogData.buttons.button.label       A button label
 * @param dialogData.buttons.button.callback    A callback function taking no arguments
 *
 * @param options           Dialog rendering options, see :class:`Application`
 * @param options.default   The name of the default button which should be triggered on Enter
 *
 * @example
 * let d = new Dialog({
 *  title: "Test Dialog",
 *  content: "<p>You must choose either Option 1, or Option 2</p>",
 *  buttons: {
 *   one: {
 *    icon: '<i class="fas fa-check"></i>',
 *    label: "Option One",
 *    callback: () => console.log("Chose One")
 *   },
 *   two: {
 *    icon: '<i class="fas fa-times"></i>',
 *    label: "Option Two",
 *    callback: () => console.log("Chose Two")
 *   }
 *  },
 *  default: "two",
 *  close: () => console.log("This always is logged no matter which option is chosen")
 * });
 * d.render(true);
 */
declare class Dialog extends Application {
    constructor(dialogData: DialogData, options?: Partial<ApplicationOptions>);

    /* -------------------------------------------- */
    /*  Factory Methods                             */
    /* -------------------------------------------- */

    /**
     * A helper factory method to create simple confirmation dialog windows which consist of simple yes/no prompts.
     * If you require more flexibility, a custom Dialog instance is preferred.
     *
     * @param title       The confirmation window title
     * @param content     The confirmation message
     * @param yes         Callback function upon yes
     * @param no          Callback function upon no
     * @param render      A function to call when the dialog is rendered
     * @param defaultYes  Make "yes" the default choice?
     * @param rejectClose Reject the Promise if the Dialog is closed without making a choice.
     * @param options    Additional rendering options passed to the Dialog
     *
     * @return A promise which resolves once the user makes a choice or closes the window
     *
     * @example
     * let d = Dialog.confirm({
     *  title: "A Yes or No Question",
     *  content: "<p>Choose wisely.</p>",
     *  yes: () => console.log("You chose ... wisely"),
     *  no: () => console.log("You chose ... poorly"),
     *  defaultYes: false
     * });
     */
    static confirm<Y = true, N = false>({
        title,
        content,
        yes,
        no,
        render,
        defaultYes,
        rejectClose,
        options,
    }?: ConfirmDialogParameters<Y, N>): Promise<Y | N>;
}
