declare interface SceneControlTool {
    name: string;
    title: string;
    icon: string;
    visible: boolean;
    toggle?: boolean;
    active?: boolean;
    button?: boolean;
    onClick?: () => void;
}

declare interface SceneControl {
    name: string;
    icon: string;
    title: string;
    layer?: string;
    visible: boolean;
    tools: SceneControlTool[];
}

/**
 * Scene controls navigation menu
 */
declare class SceneControls extends Application {
    /** The name of the active Scene Control toolset */
    activeControl: string;

    /** The Array of Scene Control buttons which are currently rendered */
    controls: SceneControl[];

    constructor(options: ApplicationOptions);

    /**
     * Return the active control set
     */
    get control(): SceneControl | null;

    /**
     * Return the name of the active tool within the active control set
     */
    get activeTool(): string | null;

    /**
     * Return the actively controled tool
     */
    get tool(): SceneControlTool | null;

    /**
     * A convenience reference for whether the currently active tool is a Ruler
     */
    get isRuler(): boolean;

    /**
     * Initialize the Scene Controls by obtaining the set of control buttons and rendering the HTML
     * @param control An optional control set to set as active
     * @param layer   An optional layer name to target as the active control
     */
    initialize({ control, layer, tool }?: { control?: string; layer?: string; tool?: string }): void;
}
