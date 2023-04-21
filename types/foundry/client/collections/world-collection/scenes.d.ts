import * as io from "socket.io";

declare global {
    /**
     * The Collection of Scene documents which exist within the active World.
     * This Collection is accessible within the Game object as game.scenes.
     */
    class Scenes<TScene extends Scene> extends WorldCollection<TScene> {
        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        static override documentName: "Scene";

        /** Return a reference to the Scene which is currently active */
        get active(): TScene | undefined;

        /**
         * Return the current Scene target.
         * This is the viewed scene if the canvas is active, otherwise it is the currently active scene.
         */
        get current(): TScene | undefined;

        /**
         * Return a reference to the Scene which is currently viewed
         */
        get viewed(): TScene | undefined;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        /**
         * Handle pre-loading the art assets for a Scene
         * @param sceneId The Scene id to begin loading
         * @param push    Trigger other connected clients to also pre-load Scene resources
         */
        preload(sceneId: string, push?: boolean): Promise<void>;

        /* -------------------------------------------- */
        /*  Event Handlers                              */
        /* -------------------------------------------- */

        /** @override */
        static _activateSocketListeners(socket: io.Socket): void;

        /** Augment the standard modifyDocument listener to flush fog exploration */
        protected static _resetFog(response: Record<string, unknown>): void;

        /** Handle requests pulling the current User to a specific Scene */
        static _pullToScene(sceneId: string): void;

        /* -------------------------------------------- */
        /*  Importing and Exporting                     */
        /* -------------------------------------------- */

        /** @override */
        fromCompendium(document: TScene): foundry.documents.SceneSource;
    }
}
