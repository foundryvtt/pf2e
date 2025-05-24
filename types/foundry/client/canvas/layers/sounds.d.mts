import { SoundPlaybackOptions } from "@client/audio/_types.mjs";
import { ElevatedPoint, Point } from "@common/_types.mjs";
import Collection from "@common/utils/collection.mjs";
import { SceneControl } from "../../applications/ui/scene-controls.mjs";
import Sound from "../../audio/sound.mjs";
import AmbientSound from "../placeables/sound.mjs";
import { PointEffectSourceData } from "../sources/point-effect-source.mjs";
import PointSoundSource from "../sources/point-sound-source.mjs";
import { AmbientSoundPlaybackConfig, PlaceablesLayerOptions } from "./_types.mjs";
import PlaceablesLayer, { PlaceablesLayerPointerEvent } from "./base/placeables-layer.mjs";

export interface AmbientSoundEffect {
    /* The type of effect in CONFIG.soundEffects */
    type: string;
    /** The intensity of the effect on the scale of [1, 10] */
    intensity: number;
}

/**
 * This Canvas Layer provides a container for AmbientSound objects.
 * @category Canvas
 */
export default class SoundsLayer<TObject extends AmbientSound = AmbientSound> extends PlaceablesLayer<TObject> {
    /** Track whether to actively preview ambient sounds with mouse cursor movements */
    livePreview: boolean;

    /** A mapping of ambient audio sources which are active within the rendered Scene */
    sources: Collection<string, PointSoundSource<TObject>>;

    static override get layerOptions(): PlaceablesLayerOptions;

    static override documentName: "AmbientSound";

    override get hookName(): string;

    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */

    protected override _draw(options?: object): Promise<void>;

    protected override _tearDown(options?: object): Promise<void>;

    protected override _activate(): void;

    /** Initialize all AmbientSound sources which are present on this layer */
    initializeSources(): void;

    /**
     * Update all AmbientSound effects in the layer by toggling their playback status.
     * Sync audio for the positions of tokens which are capable of hearing.
     * @param [options={}]  Additional options forwarded to AmbientSound synchronization
     */
    refresh(options?: object): void;

    /**
     * Preview ambient audio for a given position
     * @param {Point|ElevatedPoint} position    The position to preview
     */
    previewSound(position: Point | ElevatedPoint): void;

    /** Terminate playback of all ambient audio sources */
    stopAll(): void;

    /** Get an array of listener positions for Tokens which are able to hear environmental sound. */
    getListenerPositions(): ElevatedPoint[];

    /**
     * Sync the playing state and volume of all AmbientSound objects based on the position of listener points
     * @param {ElevatedPoint[]} listeners    Locations of listeners which have the capability to hear
     * @param {object} [options={}]          Additional options forwarded to AmbientSound synchronization
     * @protected
     */
    protected _syncPositions(listeners: ElevatedPoint[], options?: object): void;

    /**
     * Configure playback by assigning the muffled state and final playback volume for the sound.
     * This method should mutate the config object by assigning the volume and muffled properties.
     * @param config
     */
    protected _configurePlayback(config: AmbientSoundPlaybackConfig): void;

    /**
     * Actions to take when the darkness level of the Scene is changed
     * @param event
     * @internal
     */
    _onDarknessChange(event: PIXI.FederatedEvent): void;

    /**
     * Play a one-shot Sound originating from a predefined point on the canvas.
     * The sound plays locally for the current client only.
     * To play a sound for all connected clients use SoundsLayer#emitAtPosition.
     *
     * @param src                       The sound source path to play
     * @param origin                    The canvas coordinates from which the sound originates
     * @param radius                    The radius of effect in distance units
     * @param options                   Additional options which configure playback
     * @param [options.volume=1.0]      The maximum volume at which the effect should be played
     * @param [options.easing=true]     Should volume be attenuated by distance?
     * @param [options.walls=true]      Should the sound be constrained by walls?
     * @param [options.gmAlways=true]   Should the sound always be played for GM users regardless
     *                                  of actively controlled tokens?
     * @param [options.baseEffect]      A base sound effect to apply to playback
     * @param [options.muffledEffect]   A muffled sound effect to apply to playback, a sound may
     *                                  only be muffled if it is not constrained by walls
     * @param [options.sourceData]      Additional data passed to the SoundSource constructor
     * @param [options.playbackOptions] Additional options passed to Sound#play
     * @returns  A Promise which resolves to the played Sound, or null
     *
     * @example Play the sound of a trap springing
     * ```js
     * const src = "modules/my-module/sounds/spring-trap.ogg";
     * const origin = {x: 5200, y: 3700};  // The origin point for the sound
     * const radius = 30;                  // Audible in a 30-foot radius
     * await canvas.sounds.playAtPosition(src, origin, radius);
     * ```
     *
     * @example A Token casts a spell
     * ```js
     * const src = "modules/my-module/sounds/spells-sprite.ogg";
     * const origin = token.center;         // The origin point for the sound
     * const radius = 60;                   // Audible in a 60-foot radius
     * await canvas.sounds.playAtPosition(src, origin, radius, {
     *   walls: false,                      // Not constrained by walls with a lowpass muffled effect
     *   muffledEffect: {type: "lowpass", intensity: 6},
     *   sourceData: {
     *     angle: 120,                      // Sound emitted at a limited angle
     *     rotation: 270                    // Configure the direction of sound emission
     *   }
     *   playbackOptions: {
     *     loopStart: 12,                   // Audio sprite timing
     *     loopEnd: 16,
     *     fade: 300,                      // Fade-in 300ms
     *     onended: () => console.log("Do something after the spell sound has played")
     *   }
     * });
     * ```
     */
    playAtPosition(
        src: string,
        origin: Point | ElevatedPoint,
        radius: number,
        options?: {
            volume?: number;
            easing?: boolean;
            walls?: boolean;
            gmAlways?: boolean;
            baseEffect?: AmbientSoundEffect;
            muffledEffect?: AmbientSoundEffect;
            sourceData?: DeepPartial<PointEffectSourceData>;
            playbackOptions?: SoundPlaybackOptions;
        },
    ): Promise<Sound | null>;

    /**
     * Emit playback to other connected clients to occur at a specified position.
     * @param args  Arguments passed to SoundsLayer#playAtPosition
     * @returns  A Promise which resolves once playback for the initiating client has completed
     */
    emitAtPosition(args: Parameters<this["playAtPosition"]>): Promise<Sound | null>;

    static override prepareSceneControls(): SceneControl;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle mouse cursor movements which may cause ambient audio previews to occur
     * @param  currentPos
     * @internal
     */
    _onMouseMove(currentPos: PIXI.Point): void;

    protected override _onDragLeftStart(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftMove(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftDrop(event: PlaceablesLayerPointerEvent<TObject>): void;

    protected override _onDragLeftCancel(event: PlaceablesLayerPointerEvent<TObject>): void;

    /**
     * Handle PlaylistSound document drop data.
     * @param event  The drag drop event
     * @param data   The dropped transfer data.
     */
    protected _onDropData(event: DragEvent, data: object): Promise<TObject>;
}
