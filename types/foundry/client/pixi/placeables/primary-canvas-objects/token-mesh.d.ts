import type { PrimaryCanvasObjectData } from "./primary-canvas-object.d.ts";

declare global {
    /**
     * A SpriteMesh which visualizes a Token object in the PrimaryCanvasGroup.
     * @todo: fill in
     */
    class TokenMesh extends SpriteMesh {
        data: PrimaryCanvasObjectData;
        get sort(): number;

        initialize(data: { sort?: number }): void;

        refresh(): void;
    }
}
