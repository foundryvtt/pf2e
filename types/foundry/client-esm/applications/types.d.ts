import type { DataField } from "../../common/data/fields.d.ts";

declare global {
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
        handler: ApplicationFormSubmission;
        submitOnChange: boolean;
        closeOnSubmit: boolean;
    }

    interface ApplicationHeaderControlsEntry {
        /** A font-awesome icon class which denotes the control button */
        icon: string;
        /** The text label for the control button */
        label: string;
        /** The action name triggered by clicking the control button */
        action: string;
        /** Is the control button visible for the current client? */
        visible: boolean;
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
        /** Update the window title with a new value? */
        title: string;
        /** Update the window icon with a new value? */
        icon: string | false;
        /** Re-render the window controls menu? */
        controls: boolean;
    }

    interface ApplicationRenderContext {}

    interface ApplicationClosingOptions {
        /** Whether to animate the close, or perform it instantaneously */
        animate?: boolean;
        /** Whether the application was closed via keypress. */
        closeKey?: boolean;
    }

    /**
     * An on-click action supported by the Application
     * @param event The originating click event
     * @param target The capturing HTML element which defines the [data-action]
     */
    type ApplicationClickAction = (event: PointerEvent, target: HTMLElement) => Promise<void>;

    /**
     * A form submission handler method.
     * @param event The originating form submission or input change event
     * @param form The form element that was submitted
     * @param formData Processed data for the submitted form
     */
    type ApplicationFormSubmission = (
        event: SubmitEvent | Event,
        form: HTMLFormElement,
        formData: FormDataExtended,
    ) => Promise<void>;

    interface ApplicationTab {
        id: string;
        group: string;
        icon: string;
        label: string;
        active: boolean;
        cssClass: string;
    }

    interface FormNode {
        fieldset: boolean;
        legend?: string;
        fields?: FormNode[];
        field?: DataField;
        value?: unknown;
    }

    interface FormFooterButton {
        type: string;
        name?: string;
        icon?: string;
        label?: string;
        action?: string;
        cssClass?: string;
        /** @default false */
        disabled?: boolean;
    }
}
