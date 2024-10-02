import { PrimaryCanvasObjectMixin } from "./primary-canvas-object.ts";

/**
 * A mixin which decorates a DisplayObject with depth and/or occlusion properties.
 * @category - Mixins
 * @param DisplayObject The parent DisplayObject class being mixed
 * @returns A DisplayObject subclass mixed with OccludableObject features
 * @mixin
 */
/* eslint-disable @typescript-eslint/no-unused-expressions, no-unused-expressions */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function PrimaryOccludableObjectMixin<TBase extends ConstructorOf<PIXI.DisplayObject>>(DisplayObject: TBase) {
    abstract class PrimaryOccludableObject extends PrimaryCanvasObjectMixin(DisplayObject) {
        /** Is this occludable object hidden for Gamemaster visibility only? */
        declare hidden: boolean;

        /** A flag which tracks whether the primary canvas object is currently in an occluded state. */
        declare occluded: boolean;

        /** The occlusion mode of this occludable object. */
        declare occlusionMode: TileOcclusionMode;

        /** The unoccluded alpha of this object. */
        declare unoccludedAlpha: number;

        /** The occlusion alpha of this object. */
        declare occludedAlpha: number;

        /**
         * Fade this object on hover?
         * @defaultValue true
         */
        get hoverFade(): boolean {
            return true;
        }

        set hoverFade(value: boolean) {
            value;
        }

        /**
         * The amount of rendered FADE, RADIAL, and VISION occlusion.
         * @internal
         */
        declare _occlusionState: OcclusionState;

        /** The state of hover-fading. */
        declare _hoverFadeState: HoverFadeState;

        /* -------------------------------------------- */
        /*  Properties                                  */
        /* -------------------------------------------- */

        /** Get the blocking option bitmask value. */
        get _restrictionState(): number {
            return 1;
        }

        /** Is this object blocking light? */
        get restrictsLight(): boolean {
            return true;
        }

        set restrictsLight(enabled: boolean) {
            enabled;
        }

        /** Is this object blocking weather? */
        get restrictsWeather(): boolean {
            return true;
        }

        set restrictsWeather(enabled: boolean) {
            enabled;
        }

        /** Is this occludable object... occludable? */
        get isOccludable(): boolean {
            return true;
        }

        /**
         * Debounce assignment of the PCO occluded state to avoid cases like animated token movement which can rapidly
         * change PCO appearance.
         * Uses a 50ms debounce threshold.
         * Objects which are in the hovered state remain occluded until their hovered state ends.
         * @type {function(occluded: boolean): void}
         */
        declare debounceSetOcclusion: () => void;

        override updateCanvasTransform(): void {}

        /* -------------------------------------------- */
        /*  Depth Rendering                             */
        /* -------------------------------------------- */

        /**
         * Test whether a specific Token occludes this PCO.
         * Occlusion is tested against 9 points, the center, the four corners-, and the four cardinal directions
         * @param token     The Token to test
         * @param [options] Additional options that affect testing
         * @param [options.corners=true] Test corners of the hit-box in addition to the token center?
         * @returns Is the Token occluded by the PCO?
         */
        testOcclusion(token: Token, options?: { corner?: boolean }): boolean {
            token;
            options;
            return true;
        }
    }

    return PrimaryOccludableObject;
}

interface OcclusionState {
    /** The amount of FADE occlusion */
    fade: number;
    /** The amount of RADIAL occlusion */
    radial: number;
    /** The amount of VISION occlusion */
    vision: number;
}

interface HoverFadeState {
    /** The hovered state */
    hovered: boolean;
    /** The last time when a mouse event was hovering this object */
    hoveredTime: number;
    /** The faded state */
    faded: boolean;
    /** The fading state */
    fading: boolean;
    /** The time the fade animation started */
    fadingTime: number;
    /** The amount of occlusion */
    occlusion: number;
}
