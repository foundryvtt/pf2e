import "./drawing.d.ts";
import "./light.d.ts";
import "./note.d.ts";
import "./primary-canvas-objects/index.d.ts";
import * as primaryCanvasObjects from "./primary-canvas-objects/index.ts";
import "./region.d.ts";
import "./sound.d.ts";
import "./template.d.ts";
import "./tile.d.ts";
import "./token.d.ts";
import "./wall.d.ts";

declare global {
    namespace globalThis {
        export import PrimaryCanvasObject = primaryCanvasObjects.PrimaryCanvasObjectMixin;
        export import PrimaryOccludableObjectMixin = primaryCanvasObjects.PrimaryOccludableObjectMixin;
        export import PrimarySpriteMesh = primaryCanvasObjects.PrimarySpriteMesh;
    }
}
