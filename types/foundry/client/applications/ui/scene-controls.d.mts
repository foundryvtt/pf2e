import type { ApplicationConfiguration, ApplicationPosition, ApplicationRenderOptions } from "../_types.mjs";
import type { ApplicationV2, HandlebarsApplicationMixin } from "../api/_module.mjs";
import type { HandlebarsRenderOptions, HandlebarsTemplatePart } from "../api/handlebars-application.mjs";

/** The data structure for a single tool in the {@link SceneControl#tools} record. */
export interface SceneControlTool {
    name: string;
    order: number;
    title: string;
    icon: string;
    visible?: boolean;
    toggle?: boolean;
    active?: boolean;
    button?: boolean;
    /** A callback invoked when the tool is activated or deactivated */
    onChange?: (event?: Event, active?: boolean) => void;
    /** Configuration for rendering the tool's toolclip */
    toolclip?: ToolclipConfiguration;
}

/** The data structure for a set of controls in the {@link SceneControls#controls} record. */
export interface SceneControl {
    name: string;
    order: number;
    title: string;
    icon: string;
    visible?: boolean;
    tools: Record<string, SceneControlTool>;
    activeTool: string;
    /** A callback invoked when control set is activated or deactivated */
    onChange?: (event: Event, active: boolean) => void;
    /** A callback invoked when the active tool changes */
    onToolChange?: (event: Event, tool: SceneControlTool) => void;
}

interface ToolclipConfiguration {
    /** The filename of the toolclip video. */
    src: string;
    /** The heading string. */
    heading: string;
    /** The items in the toolclip body. */
    items: ToolclipConfigurationItem[];
}

interface ToolclipConfigurationItem {
    /** A plain paragraph of content for this item. */
    paragraph?: string;
    /** A heading for the item. */
    heading?: string;
    /** Content for the item. */
    content?: string;
    /** If the item is a single key reference, use this instead of content. */
    reference?: string;
}

/** Options that can be passed to {@link SceneControls#render} to customize rendering behavior. */
interface SceneControlsRenderOptions extends HandlebarsRenderOptions {
    /** An event which prompted a re-render */
    event?: Event;
    /** Re-prepare the possible list of controls */
    reset?: boolean;
    /** The control set to activate. If undefined, the current control set remains active */
    control?: string;
    /** A specific tool to activate. If undefined the current tool or default tool for the control set becomes active */
    tool?: string;
    /** Changes to apply to toggles within the control set */
    toggles?: Record<string, boolean>;
}

/** The data structure provided to the {@link SceneControl#onChange} callback. */
interface SceneControlsActivationChange {
    event: Event;
    controlChange: boolean;
    toolChange: boolean;
    toggleChanges: Record<string, boolean>;
}

/**
 * The Scene Controls UI element.
 * @alias SceneControls
 */
export default class SceneControls extends HandlebarsApplicationMixin(
    ApplicationV2<ApplicationConfiguration, SceneControlsRenderOptions>,
) {
    static override DEFAULT_OPTIONS: ApplicationConfiguration;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /** Prepared data of available controls. */
    get controls(): Record<string, SceneControl>;

    /** The currently active control layer. */
    get control(): SceneControl | null;

    /** The tools which are available within the current control layer. */
    get tools(): Record<string, SceneControlTool>;

    /** The currently active tool in the control palette. */
    get tool(): SceneControlTool;

    /* -------------------------------------------- */
    /*  Public API                                  */
    /* -------------------------------------------- */

    /**
     * Activate a new control layer or tool.
     * This method is advantageous to use because it minimizes the amount of re-rendering necessary.
     */
    activate(options?: Pick<SceneControlsRenderOptions, "event" | "control" | "tool" | "toggles">): Promise<void>;

    /* -------------------------------------------- */
    /*  Rendering Methods                           */
    /* -------------------------------------------- */

    protected override _configureRenderOptions(options: Partial<ApplicationRenderOptions>): ApplicationRenderOptions;

    protected override _preRender(context: object, options: ApplicationRenderOptions): Promise<void>;

    protected override _prepareContext(options: ApplicationRenderOptions): Promise<object>;

    protected override _onRender(context: object, options: ApplicationRenderOptions): Promise<void>;

    /**
     * Update the class of the notes layer icon to reflect whether there are visible notes or not.
     * @internal
     */
    _updateNotesIcon(): void;

    override setPosition(position?: Partial<ApplicationPosition>): ApplicationPosition;

    /* -------------------------------------------- */
    /*  Toolclip Definitions                        */
    /* -------------------------------------------- */

    /** Reusable toolclip items. */
    static COMMON_TOOLCLIP_ITEMS: Record<string, { heading: string; reference: string }>;

    /** A helper function used to prepare an array of toolclip items. */
    static buildToolclipItems(items: (ToolclipConfigurationItem | string | null)[]): ToolclipConfigurationItem[];
}
