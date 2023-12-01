/** Scene controls navigation menu */
declare class SceneControls extends Application {
    static override get defaultOptions(): ApplicationOptions;

    /** The Array of Scene Control buttons which are currently rendered */
    controls: SceneControl[];

    /** The currently active control set */
    get activeControl(): string;

    /** Return the name of the active tool within the active control set */
    get activeTool(): string | null;

    /** Return the active control set */
    get control(): SceneControl | null;

    /** Return the actively controled tool */
    get tool(): string | null;

    /** A convenience reference for whether the currently active tool is a Ruler */
    get isRuler(): boolean;

    /**
     * Initialize the Scene Controls by obtaining the set of control buttons and rendering the HTML
     * @param options Options which modify how the controls UI is initialized
     * @param [options.control] An optional control set to set as active
     * @param [options.layer]   An optional layer name to target as the active control
     * @param [options.tool]    A specific named tool to set as active for the palette
     */
    initialize(options?: { control?: string; layer?: string; tool?: string }): void;

    override getData(options?: Partial<ApplicationOptions>): Promise<object>;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners(html: JQuery): void;
}

declare interface SceneControlTool {
    name: string;
    title: string;
    icon: string;
    visible: boolean;
    toggle?: boolean;
    active?: boolean;
    button?: boolean;
    onClick?: () => void;
    /** Configuration for rendering the tool's toolclip. */
    toolclip?: ToolclipConfiguration;
}

declare interface SceneControl {
    name: string;
    icon: string;
    title: string;
    layer: string;
    visible: boolean;
    tools: SceneControlTool[];
    activeTool: string;
}

declare interface ToolclipConfiguration {
    /** The filename of the toolclip video. */
    src: string;
    /** The heading string. */
    heading: string;
    /** The items in the toolclip body. */
    items: ToolclipConfigurationItem[];
}

declare interface ToolclipConfigurationItem {
    /** A plain paragraph of content for this item. */
    paragraph?: string;
    /** A heading for the item. */
    heading?: string;
    /** Content for the item. */
    content?: string;
    /** If the item is a single key reference, use this instead of content. */
    reference?: string;
}
