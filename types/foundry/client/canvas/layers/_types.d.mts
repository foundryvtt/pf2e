import Sound from "@client/audio/sound.mjs";
import { ElevatedPoint } from "@common/_types.mjs";
import { SpriteMesh } from "../containers/_module.mjs";
import PlaceableObject from "../placeables/placeable-object.mjs";
import AmbientSound from "../placeables/sound.mjs";
import PointSoundSource from "../sources/point-sound-source.mjs";
import { CanvasLayerOptions } from "./base/canvas-layer.mjs";

export interface AmbientSoundPlaybackConfig {
    /** The Sound node which should be controlled for playback */
    sound: Sound;
    /** The SoundSource which defines the area of effect for the sound */
    source: PointSoundSource<AmbientSound>;
    /** An AmbientSound object responsible for the sound, or undefined */
    object?: AmbientSound;
    /** The coordinates of the closest listener or undefined if there is none */
    listener?: ElevatedPoint;
    /** The minimum distance between a listener and the AmbientSound origin */
    distance: number;
    /** Is the closest listener muffled */
    muffled: boolean;
    /** Is playback constrained or muffled by walls? */
    walls: boolean;
    /** The final volume at which the Sound should be played */
    volume: number;
}

export interface CanvasHistoryEvent<TData extends object = object> {
    /** The type of operation stored as history */
    type: "create" | "update" | "delete";
    /** The data corresponding to the action which may later be un-done */
    data: TData[];
    /** The options of the undo operation */
    options: object;
}

export interface PlaceablesLayerOptions extends CanvasLayerOptions {
    /** Can placeable objects in this layer be controlled? */
    controllableObjects: boolean;
    /** Can placeable objects in this layer be rotated? */
    rotatableObjects: boolean;
    /** Confirm placeable object deletion with a dialog? */
    confirmDeleteKey: boolean;
    /** The class used to represent an object on this layer. */
    objectClass: AbstractConstructorOf<PlaceableObject>;
    /** Does this layer use a quadtree to track object positions? */
    quadtree: boolean;
}

/**
 * The sight part of {@link foundry.canvas.layers.types.CanvasVisionContainer}.
 * The blend mode is MAX_COLOR.
 */
export interface CanvasVisionContainerSight extends PIXI.Graphics {
    /** FOV that should not be committed to fog exploration. */
    preview: PIXI.Graphics;
}

/**
 * The light part of {@link foundry.canvas.layers.types.CanvasVisionContainer}.
 * The blend mode is MAX_COLOR.
 */
export interface CanvasVisionContainerLight extends PIXI.Graphics {
    /** FOV that should not be committed to fog exploration. */
    preview: PIXI.Graphics;
    /** The sprite with the texture of FOV of cached light sources. */
    cached: SpriteMesh;
    /** The light perception polygons of vision sources and the FOV of vision sources that provide vision. */
    mask: CanvasVisionContainerSight;
}

/**
 * The sight part of {@link foundry.canvas.layers.types.CanvasVisionContainer}.
 * The blend mode is ERASE.
 */
export interface CanvasVisionContainerDarkness extends PIXI.Graphics {
    /** Darkness source erasing fog of war. */
    darkness: PIXI.Graphics;
}

/** The currently visible areas. */
export interface CanvasVisionContainer extends PIXI.Container {
    /** Areas visible because of light sources and light perception. */
    light: CanvasVisionContainerLight;
    /** Areas visible because of FOV of vision sources. */
    sight: CanvasVisionContainerSight;
    /** Areas visible because of FOV of vision sources. */
    darkness: CanvasVisionContainerDarkness;
}
