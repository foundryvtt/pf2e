import type { ClientBaseFogExploration } from "./client-base-mixes.d.ts";

declare global {
    /** The client-side FogExploration document which extends the common BaseFogExploration model. */
    class FogExploration extends ClientBaseFogExploration {
        static override get(documentId: string, operation?: DatabaseGetOperation<null>): FogExploration | null;

        /** Transform the explored base64 data into a PIXI.Texture object */
        getTexture(): PIXI.Texture | null;

        protected override _onCreate(
            data: this["_source"],
            options: DatabaseCreateOperation<null>,
            userId: string,
        ): void;

        protected override _onUpdate(
            data: DeepPartial<this["_source"]>,
            options: DatabaseUpdateOperation<null>,
            userId: string,
        ): void;

        protected override _onDelete(options: DatabaseDeleteOperation<null>, userId: string): void;
    }
}
