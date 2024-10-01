/**
 * A framework for imbuing special scripted behaviors into a single specific Scene.
 * Managed scenes are registered in CONFIG.Canvas.managedScenes.
 *
 * The SceneManager instance is called at various points in the Scene rendering life-cycle.
 *
 * This also provides a framework for registering additional hook events which are required only for the life-cycle of
 * the managed Scene.
 *
 * @example Registering a custom SceneManager
 * ```js
 * // Define a custom SceneManager subclass
 * class MyCustomSceneManager extends SceneManager {
 *   async _onInit() {
 *     console.log(`Initializing managed Scene "${this.scene.name}"`);
 *   }
 *
 *   async _onDraw() {
 *     console.log(`Drawing managed Scene "${this.scene.name}"`);
 *   }
 *
 *   async _onReady() {
 *     console.log(`Readying managed Scene "${this.scene.name}"`);
 *   }
 *
 *   async _onTearDown() {
 *     console.log(`Deconstructing managed Scene "${this.scene.name}"`);
 *   }
 *
 *   _registerHooks() {
 *     this.registerHook("updateToken", this.#onUpdateToken.bind(this));
 *   }
 *
 *   #onUpdateToken(document, updateData, options, userId) {
 *     console.log("Updating a token within the managed Scene");
 *   }
 * }
 *
 * // Register MyCustomSceneManager to be used for a specific Scene
 * CONFIG.Canvas.sceneManagers = {
 *   [sceneId]: MyCustomSceneManager
 * }
 * ```
 */
export class SceneManager {
    /** The SceneManager is constructed by passing a reference to the active Scene document. */
    constructor(scene: Scene);

    /** The managed Scene. */
    get scene(): Scene;

    /* -------------------------------------------- */
    /*  Scene Life-Cycle Methods                    */
    /* -------------------------------------------- */

    /** Additional behaviors to perform when the Canvas is first initialized for the Scene. */
    _onInit(): Promise<void>;

    /** Additional behaviors to perform after core groups and layers are drawn to the canvas. */
    _onDraw(): Promise<void>;

    /** Additional behaviors to perform after the Canvas is fully initialized for the Scene. */
    _onReady(): Promise<void>;

    /** Additional behaviors to perform when the Scene is deactivated. */
    _onTearDown(): Promise<void>;

    /* -------------------------------------------- */
    /*  Scene Hooks                                 */
    /* -------------------------------------------- */

    /**
     * Register additional hook functions are only used while this Scene is active and is automatically deactivated.
     * Hooks should be registered in this function by calling this._registerHook(hookName, handler)
     */
    _registerHooks(): void;

    /** Register additional hook functions are only used while this Scene is active and is automatically deactivated. */
    registerHook(hookName: string, handler: (...args: unknown[]) => number | void): void;

    /** Deactivate Hook functions that were added specifically for this Scene. */
    _deactivateHooks(): void;
}
