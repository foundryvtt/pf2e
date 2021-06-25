// @TODO:

/**
 * Top menu scene navigation
 */
declare class SceneNavigation extends Application {
    /**
     * Return an Array of Scenes which are displayed in the Navigation bar
     */
    get scenes(): Scene[];

    /**
     * Expand the SceneNavigation menu, sliding it down if it is currently collapsed
     */
    expand(): Promise<boolean>;

    /**
     * Collapse the SceneNavigation menu, sliding it up if it is currently expanded
     */
    collapse(): Promise<boolean>;
}
