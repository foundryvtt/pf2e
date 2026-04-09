import Sound from "@client/audio/sound.mjs";
import RegionDocument from "@client/documents/region.mjs";
import { ElevatedPoint, Point } from "@common/_types.mjs";
import { DatabaseCreateOperation } from "@common/abstract/_types.mjs";
import { BaseShapeData } from "@common/data/_module.mjs";
import { SpriteMesh } from "../containers/_module.mjs";
import { AmbientSound, PlaceableObject, Region } from "../placeables/_module.mjs";
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

/**
 * @typedef RegionPlacementOptions
 * @property {boolean} [create=true]  Create the Region? If false, the preview document is returned.
 *                                    Default: `true`. Non-GMs cannot create Regions while the game is paused.
 * @property {Partial<Omit<DatabaseCreateOperation, "parent">>} [createOptions]  Optional creation options.
 *   By default the creation option `controlObject` is true.
 * @property {boolean} [allowRotation=true]
 * @property {boolean} [allowEmpty=false]
 * @property {boolean} [attachToToken=false] Attach the Region to Tokens? If true, the initial elevation range
 *   passed in `data` is relative to the attached Token. Default: `false`.
 * @property {(args: {event: PIXI.FederatedEvent; preview: Region; document: RegionDocument; regionIndex: number;
 *     regionCount: number; shape: BaseShapeData; shapeIndex: number; shapeCount: number; position: Point;
 *     snap: boolean}) => boolean|void} [onMove]
 * @property {(args: {event: WheelEvent; preview: Region; document: RegionDocument; regionIndex: number;
 *   regionCount: number; shape: BaseShapeData; shapeIndex: number; shapeCount: number;
 *   precise: boolean}) => boolean|void} [onRotate]

 * @property {(args: {preview: Region; document: RegionDocument; regionIndex: number; regionCount: number;
 *     shape: BaseShapeData; shapeIndex: number; shapeCount: number}) => void} [onChange]
 *
 * @property {(args: {event: PIXI.FederatedEvent; document: RegionDocument; regionIndex: number; regionCount: number;
 *     shape: BaseShapeData; shapeIndex: number; shapeCount: number}) => boolean|void} [preConfirm]
 *
 * @property {(args: {event: PIXI.FederatedEvent; document: RegionDocument; regionIndex: number; regionCount: number;
 *     shape: BaseShapeData; shapeIndex: number; shapeCount: number}) => boolean|void} [preSkip]
 *
 */

interface RegionPlacementOptions<TRegion extends Region> {
    /**
     * Create the Region? If false, the preview document is returned. Default: `true`. Non-GMs cannot create Regions
     * while the game is paused.
     */
    create?: boolean;
    /** Optional creation options. By default the creation option `controlObject` is true. */
    createOptions?: Partial<Omit<DatabaseCreateOperation<null>, "parent">>;
    /** Allow rotation of the Region? Default: `true`. */
    allowRotation?: boolean;
    /** Create/return an empty Region if all shapes are skipped? Default: `false`. */
    allowEmpty?: boolean;
    /**
     * Attach the Region to Tokens? If true, the initial elevation range passed in `data` is relative to the attached
     * Token. Default: `false`.
     */
    attachToToken?: boolean;
    /**
     * Called when the pointer is moved and after starting the placement of the next shape on confirm and skip. This
     * callback replaces the default behavior if false is returned. If false is returned, the callback should modify
     * the passed `shape` and may additionally modify `preview.document` and set the render flags on `preview`
     * corresponding to the applied changes.
     */
    onMove?: (args: {
        event: PIXI.FederatedPointerEvent;
        preview: TRegion;
        document: TRegion["document"];
        regionIndex: number;
        regionCount: number;
        shape: BaseShapeData;
        shapeIndex: number;
        shapeCount: number;
        position: Point;
        snap: boolean;
    }) => boolean | void;
    /**
     * Called when the mouse wheel is scrolled. This callback replaces the default behavior if false is returned.
     * If false is returned, the callback should modify the `shape` and may additionally modify `preview.document`
     * and set the render flags on `preview` corresponding to the applied changes.
     */
    onRotate?: (args: {
        event: WheelEvent;
        preview: TRegion;
        document: TRegion["document"];
        regionIndex: number;
        regionCount: number;
        shape: BaseShapeData;
        shapeIndex: number;
        shapeCount: number;
        precise: boolean;
    }) => boolean | void;
    /** Called when the Region shape that is placed has changed. */
    onChange?: (args: {
        preview: TRegion;
        document: TRegion["document"];
        regionIndex: number;
        regionCount: number;
        shape: BaseShapeData;
        shapeIndex: number;
        shapeCount: number;
    }) => void;
    /**
     * Called before the confirmation (left-click) of a shape placement. This callback may return false to prevent the
     * placement of the Region shape and display a warning.
     */
    preConfirm?: (args: {
        event: PIXI.FederatedEvent;
        document: TRegion["document"];
        regionIndex: number;
        regionCount: number;
        shape: BaseShapeData;
        shapeIndex: number;
        shapeCount: number;
    }) => boolean | void;
    /**
     * Called before skipping (right-click) of a shape placement. This callback may return false to prevent skipping of
     * the Region shape and display a warning.
     */
    preSkip?: (args: {
        event: PIXI.FederatedEvent;
        document: TRegion["document"];
        regionIndex: number;
        regionCount: number;
        shape: BaseShapeData;
        shapeIndex: number;
        shapeCount: number;
    }) => boolean | void;
}
