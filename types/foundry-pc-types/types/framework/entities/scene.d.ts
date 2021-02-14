/**
 * The collection of Scene entities
 */
declare class Scenes extends EntityCollection<Scene> {
    /** @override */
    get entity(): 'Scene';
}

declare interface SceneData extends BaseEntityData {
    tokens: TokenData[];
}

/**
 * The Scene Entity.
 * Scenes represent the locations and settings which Actors will explore within the World.
 */
declare class Scene extends Entity {
    data: SceneData;

    /**
     * Track whether the scene is the active view
     */
    _view: boolean;

    /**
     * Track the viewed position of each scene (while in memory only, not persisted)
     * When switching back to a previously viewed scene, we can automatically pan to the previous position.
     */
    _viewPosition: {} | {
        x: number;
        y: number;
        scale: number;
    };

    /** @override */
    prepareData(): void;

    /** @override */
    prepareEmbeddedEntities(): void;

    /**
     * A convenience accessor for the background image of the Scene
     */
    get img(): string;

    /**
     * A convenience accessor for whether the Scene is currently active
     */
    get active(): boolean;

    /**
     * A convenience accessor for whether the Scene is currently viewed
     */
    get isView(): boolean;

    /**
     * A reference to the JournalEntry entity associated with this Scene, or null
     */
    get journal(): JournalEntry | null;

    /**
     * A reference to the Playlist entity for this Scene, or null
     */
    get playlist(): Playlist | null;

    /**
     * Set this scene as the current view
     */
    view(): Promise<void>;

  /**
   * Set this scene as currently active
   * @return A Promise which resolves to the current scene once it has been successfully activated
   */
    activate(): Promise<Scene>;
}
