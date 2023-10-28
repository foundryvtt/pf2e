import type { ClientBaseFogExploration } from "./client-base-mixes.d.ts";

declare global {
    /** The client-side FogExploration document which extends the common BaseFogExploration model. */
    class FogExploration extends ClientBaseFogExploration {
        /**
         * Obtain the fog of war exploration progress for a specific Scene and User.
         * @param [query] Parameters for which FogExploration document is retrieved
         * @param [query.scene] A certain Scene ID
         * @param [query.user]  A certain User ID
         * @param [options={}]  Additional options passed to DatabaseBackend#get
         */
        static get(
            query?: { scene?: string; user?: string },
            options?: Record<string, unknown>,
        ): Promise<FogExploration | null>;

        /** Transform the explored base64 data into a PIXI.Texture object */
        getTexture(): PIXI.Texture | null;

        protected override _onCreate(
            data: this["_source"],
            options: DocumentModificationContext<null>,
            userId: string,
        ): void;

        protected override _onUpdate(
            data: DeepPartial<this["_source"]>,
            options: DocumentModificationContext<null>,
            userId: string,
        ): void;

        protected override _onDelete(options: DocumentModificationContext<null>, userId: string): void;
    }
}
