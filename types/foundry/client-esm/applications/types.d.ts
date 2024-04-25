interface ApplicationConfiguration {
    /** An HTML element identifier used for this Application instance */
    id: string;
    /** An string discriminator substituted for {id} in the default HTML element identifier for the class */
    uniqueId: string;
    /** An array of CSS classes to apply to the Application */
    classes: string[];
    /** The HTMLElement tag type used for the outer Application frame */
    tag: string;
    /** Configuration of the window behaviors for this Application */
    window: ApplicationWindowConfiguration;
    /** Click actions supported by the Application and their event handler functions */
    actions: Record<string, ApplicationClickAction>;
    /** Configuration used if the application top-level element is a form */
    form?: ApplicationFormConfiguration;
    /** Default positioning data for the application */
    position: Partial<ApplicationPosition>;
}

// todo: ApplicationPosition isn't quite the same as the original. Type it properly, but this will require research

interface ApplicationWindowConfiguration {
    /**
     * Is this Application rendered inside a window frame?
     * @default true
     */
    frame?: boolean;

    /**
     * Can this Application be positioned via JavaScript or only by CSS
     * @default true
     */
    positioned?: boolean;

    /** The window title. Displayed only if the application is framed */
    title?: string;

    /** An optional Font Awesome icon class displayed left of the window title */
    icon?: string | false;

    /** An array of window control entries */
    controls: ApplicationHeaderControlsEntry[];

    /**
     * Can the window app be minimized by double-clicking on the title
     * @default true
     */
    minimizable?: boolean;

    /**
     * Is this window resizable?
     * @default false
     */
    resizable?: boolean;

    /**
     * A specific tag name to use for the .window-content element
     * @default "section"
     */
    contentTag?: string;

    /** Additional CSS classes to apply to the .window-content element */
    contentClasses?: string[];
}

interface ApplicationFormConfiguration {
    // todo: add types
}

interface ApplicationHeaderControlsEntry {
    // todo: add types
}

interface ApplicationConstructorParams {
    position: ApplicationPosition;
}

interface ApplicationRenderOptions {
    /**
     * Force application rendering.
     * If true, an application which does not yet exist in the DOM is added.
     * If false, only applications which already exist are rendered.
     * @default false
     */
    force?: boolean;
}

interface ApplicationWindowRenderOptions {
    // todo: add types
}

interface ApplicationRenderContext {
    // todo: add types
}

interface ApplicationClosingOptions {
    // todo: add types
}

type ApplicationClickAction = (this: unknown, event: PointerEvent, target: HTMLElement) => Promise<void>;

interface ApplicationFormSubmission {
    // todo: add types
}

interface ApplicationTab {
    // todo: add types
}

interface FormNode {
    // todo: add types
}

interface FormFooterButton {
    // todo: add types
}
