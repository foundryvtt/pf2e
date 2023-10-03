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

    /**
     * Display progress of some major operation like loading Scene textures.
     * @param options    Options for how the progress bar is displayed
     * @param options.label  A text label to display
     * @param options.pct    A percentage of progress between 0 and 100
     */
    static displayProgressBar(options: { label?: string; pct?: number }): void;
}
