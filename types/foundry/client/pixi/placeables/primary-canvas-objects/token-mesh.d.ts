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

        /**
         * Get the attributes for this TokenMesh which configure the display of this TokenMesh and are compatible
         * with CanvasAnimation.
         */
        getDisplayAttributes(): TokenMeshDisplayAttributes;
    }

    interface TokenMeshDisplayAttributes {
        x: number;
        y: number;
        width: number;
        height: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
        tint: Color;
    }
}
