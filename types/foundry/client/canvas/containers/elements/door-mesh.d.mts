import { CanvasAnimationAttribute } from "@client/canvas/animation/_types.mjs";
import { WallDoorAnimationConfig } from "@client/config.mjs";
import PrimarySpriteMesh, { PrimarySpriteMeshConstructorOptions } from "../../primary/primary-sprite-mesh.mjs";

interface DoorAnimationConfiguration {
    direction?: number;
    double?: boolean;
    duration?: number;
    flip?: boolean;
    strength?: number;
    type?: string;
    style?: DoorStyle;
    config: WallDoorAnimationConfig;
}

interface DoorStateSnapshot {
    x: number;
    y: number;
    elevation: number;
    sort: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    tint: number;
}

type DoorStyle = (typeof DoorMesh.DOOR_STYLES)[keyof typeof DoorMesh.DOOR_STYLES];

interface DoorMeshConstructorOptions extends PrimarySpriteMeshConstructorOptions, DoorAnimationConfiguration {
    style: DoorStyle;
}

/**
 * A special subclass of PrimarySpriteMesh used to render an interactive door.
 */
export default class DoorMesh extends PrimarySpriteMesh {
    /**
     * Construct a DoorMesh by providing PrimarySpriteMesh constructor options and specific door configuration.
     */
    constructor(options: DoorMeshConstructorOptions);

    /**
     * The possible rendering styles for a door mesh.
     */
    static DOOR_STYLES: Readonly<{
        SINGLE: "single";
        DOUBLE_LEFT: "doubleL";
        DOUBLE_RIGHT: "doubleR";
    }>;

    /**
     * The original position of the door in its resting CLOSED state.
     * @internal
     */
    _closedPosition: DoorStateSnapshot;

    /**
     * The currently rendered position of the door.
     * @internal
     */
    _animatedPosition: DoorStateSnapshot;

    /**
     * An amount of pixel padding surrounding the door texture.
     */
    texturePadding: number;

    /**
     * The identifier for this door animation.
     */
    get animationId(): string;

    /* -------------------------------------------- */
    /*  Initialization and Data Preparation         */
    /* -------------------------------------------- */

    /**
     * Configure and initialize the DoorMesh.
     * This is called automatically upon construction, but may be called manually later to update the DoorMesh.
     */
    initialize(animation: DoorAnimationConfiguration): void;

    /* -------------------------------------------- */
    /*  Rendering and Animation                     */
    /* -------------------------------------------- */

    /**
     * Animate the door to its current rendered state.
     * @param open Is the door now open or closed?
     */
    animate(open: boolean): Promise<void>;

    /**
     * Configure the "swing" animation.
     */
    static animateSwing(open: boolean): CanvasAnimationAttribute[];

    /**
     * Configure the "ascend" animation.
     */
    static animateAscend(open: boolean): CanvasAnimationAttribute[];

    /**
     * Special initialization needed for descending door types.
     */
    static initializeDescend(open: boolean): void;

    /**
     * When closing a descending door, shift its elevation to the foreground before animation.
     */
    static preAnimateDescend(open: boolean): Promise<void>;

    /**
     * Configure the "descend" animation.
     */
    static animateDescend(open: boolean): CanvasAnimationAttribute[];

    /**
     * When opening a descending door, shift its elevation to the background after animation.
     */
    static postAnimateDescend(open: boolean): Promise<void>;

    /**
     * Configure the "slide" animation.
     */
    static animateSlide(open: boolean): CanvasAnimationAttribute[];
}
