import { DataField } from "../../common/data/fields.mjs";
import FormDataExtended from "./ux/form-data-extended.mjs";

export interface ApplicationConfiguration {
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

export interface ApplicationPosition {
    /** Window offset pixels from top */
    top: number;
    /** Window offset pixels from left */
    left: number;
    /** Un-scaled pixels in width or "auto" */
    width: number | "auto";
    /** Un-scaled pixels in height or "auto" */
    height: number | "auto";
    /** A numeric scaling factor applied to application dimensions */
    scale: number;
    /** A z-index of the application relative to siblings */
    zIndex: number;
}

export interface ApplicationWindowConfiguration {
    /**
     * Is this Application rendered inside a window frame?
     * @default true
     */
    frame: boolean;

    /**
     * Can this Application be positioned via JavaScript or only by CSS
     * @default true
     */
    positioned: boolean;

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
    minimizable: boolean;

    /**
     * Is this window resizable?
     * @default false
     */
    resizable: boolean;

    /**
     * A specific tag name to use for the .window-content element
     * @default "section"
     */
    contentTag: string;

    /** Additional CSS classes to apply to the .window-content element */
    contentClasses: string[];
}

export interface ApplicationFormConfiguration {
    handler: ApplicationFormSubmission;
    submitOnChange: boolean;
    closeOnSubmit: boolean;
}

interface ApplicationTabsConfiguration {
    /** An array of tab configuration data */
    tabs: { id: string; icon?: string; label?: string; tooltip?: string }[];
    /** The tab in this group that will be active on first render */
    initial?: string | null;
    /**
     * A localization path prefix for all tabs in the group: if set, a label is generated for each tab using a full
     * path of `${labelPrefix}.${tabId}`.
     */
    labelPrefix?: string;
}

/**
 * @typedef ApplicationTabsConfiguration
 * @property {{id: string; icon?: string; label?: string; tooltip?: string}[]} tabs
 * @property {string} [initial]
 * @property {string} [labelPrefix]
 */

export interface ApplicationHeaderControlsEntry {
    /** A font-awesome icon class which denotes the control button */
    icon: string;
    /** The text label for the control button */
    label: string;
    /** The action name triggered by clicking the control button */
    action: string;
    /** Is the control button visible for the current client? */
    visible: boolean;
}

export interface ApplicationConstructorParams {
    position: ApplicationPosition;
}

export interface ApplicationRenderOptions {
    /**
     * Force application rendering.
     * If true, an application which does not yet exist in the DOM is added.
     * If false, only applications which already exist are rendered.
     * @default false
     */
    force: boolean;
    /** A specific position at which to render the Application */
    position: ApplicationPosition;
    /** Updates to the Application window frame */
    window: ApplicationWindowRenderOptions;
    /** Is this render the first one for the application? This property is populated automatically. */
    isFirstRender: boolean;
}

export interface ApplicationWindowRenderOptions {
    /** Update the window title with a new value? */
    title: string;
    /** Update the window icon with a new value? */
    icon: string | false;
    /** Re-render the window controls menu? */
    controls: boolean;
}

interface ApplicationRenderContext {
    /** Tab data prepared from an entry in {@link foundry.applications.api.ApplicationV2.TABS} */
    tabs?: Record<string, ApplicationTab>;
}

export interface ApplicationClosingOptions {
    /** Whether to animate the close, or perform it instantaneously */
    animate?: boolean;
    /** Whether the application was closed via keypress. */
    closeKey?: boolean;
}

export type ApplicationClickHandler = (event: PointerEvent, target: HTMLElement) => void | Promise<void>;

/**
 * An on-click action supported by the Application
 * @param event The originating click event
 * @param target The capturing HTML element which defines the [data-action]
 */
export type ApplicationClickAction = ApplicationClickHandler | { handler: ApplicationClickHandler; buttons: number[] };

/**
 * A form submission handler method.
 * @param event The originating form submission or input change event
 * @param form The form element that was submitted
 * @param formData Processed data for the submitted form
 */
export type ApplicationFormSubmission = (
    event: Event,
    form: HTMLFormElement,
    formData: FormDataExtended,
) => Promise<void>;

export interface ApplicationTab {
    id: string;
    group: string;
    icon: string;
    label: string;
    active: boolean;
    cssClass: string;
}

export interface FormNode {
    fieldset: boolean;
    legend?: string;
    fields?: FormNode[];
    field?: DataField;
    value?: unknown;
}

export interface FormFooterButton {
    type: string;
    name?: string;
    icon?: string;
    label?: string;
    action?: string;
    cssClass?: string;
    /** @default false */
    disabled?: boolean;
}
