import * as io from "socket.io";
import type { ClientBaseFogExploration } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side FogExploration document which extends the common BaseFogExploration abstraction.
     * Each FogExploration document contains FogExplorationData which defines its data schema.
     */
    class FogExploration extends ClientBaseFogExploration {
        constructor(
            data?: PreCreate<foundry.documents.FogExplorationSource>,
            context?: DocumentConstructionContext<null>
        );

        /**
         * Explore fog of war for a new point source position.
         * @param source        The candidate source of exploration
         * @param [force=false] Force the position to be re-explored
         * @returns Is the source position newly explored?
         */
        explore(source: PointSource<Token | null>, force?: boolean): boolean;

        /** Obtain the fog of war exploration progress for a specific Scene and User. */
        static get<T extends FogExploration>(
            this: ConstructorOf<T>,
            { scene, user }?: { scene?: Scene; user?: User },
            options?: Record<string, unknown>
        ): Promise<T | null>;

        /** Transform the explored base64 data into a PIXI.Texture object */
        getTexture(): PIXI.Texture | null;

        /** Open Socket listeners which transact JournalEntry data */
        protected static _activateSocketListeners(socket: io.Socket): void;

        /** Handle a request from the server to reset fog of war for a particular scene. */
        protected static _onResetFog(sceneId: string): void;
    }
}
