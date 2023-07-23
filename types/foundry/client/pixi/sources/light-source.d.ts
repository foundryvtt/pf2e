export {};

declare global {
    /**
     * A specialized subclass of the PointSource abstraction which is used to control the rendering of light sources.
     * @param [options.object] The light-emitting object that generates this light source
     */
    class LightSource<TObject extends AmbientLight | Token | null> extends RenderedPointSource<TObject> {
        static sourceType: string;

        protected static override _initializeShaderKeys: string[];

        protected static override _refreshUniformsKeys: string[];

        /* -------------------------------------------- */
        /*  Light Source Attributes                     */
        /* -------------------------------------------- */

        /** The object of data which configures how the source is rendered */
        override data: LightSourceData;

        /** The ratio of dim:bright as part of the source radius */
        ratio: number;

        /* -------------------------------------------- */
        /*  Light Source Properties                     */
        /* -------------------------------------------- */

        /** Is this darkness? */
        get isDarkness(): boolean;

        /* -------------------------------------------- */
        /*  Light Source Initialization                 */
        /* -------------------------------------------- */

        /**
         * Initialize the source with provided object data.
         * @param data Initial data provided to the point source
         * @return A reference to the initialized source
         */
        protected override _initialize(data?: Partial<LightSourceData>): void;

        protected override _configure(changes: object): void;

        protected override _getPolygonConfiguration(): PointSourcePolygonConfig;

        protected override _initializeBlending(): void;

        /* -------------------------------------------- */
        /*  Shader Management                           */
        /* -------------------------------------------- */

        protected override _updateColorationUniforms(): void;

        protected override _updateIlluminationUniforms(): void;

        protected override _updateBackgroundUniforms(): void;

        protected _updateCommonUniforms(shader: PIXI.Shader): void;

        /**
         * Map luminosity value to exposure value
         * luminosity[-1  , 0  [ => Darkness => map to exposure ]   0, 1]
         * luminosity[ 0  , 0.5[ => Light    => map to exposure [-0.5, 0[
         * luminosity[ 0.5, 1  ] => Light    => map to exposure [   0, 1]
         * @param lum The luminosity value
         * @return The exposure value
         */
        protected _mapLuminosity(lum: number): number;

        /* -------------------------------------------- */
        /*  Animation Functions                         */
        /* -------------------------------------------- */
        /**
         * An animation with flickering ratio and light intensity.
         * @param dt           Delta time
         * @param [options={}] Additional options which modify the flame animation
         * @param [options.speed=5]       The animation speed, from 1 to 10
         * @param [options.intensity=5]   The animation intensity, from 1 to 10
         * @param [options.reverse=false] Reverse the animation direction
         */
        animateTorch(dt: number, options?: { speed?: number; intensity?: number; reverse?: boolean }): void;

        /**
         * An animation with flickering ratio and light intensity
         * @param dt           Delta time
         * @param [options={}] Additional options which modify the flame animation
         * @param [options.speed=5]         The animation speed, from 1 to 10
         * @param [options.intensity=5]     The animation intensity, from 1 to 10
         * @param [options.amplification=1] Noise amplification (>1) or dampening (<1)
         * @param [options.reverse=false]   Reverse the animation direction
         */
        animateFlickering(
            dt: number,
            options?: { speed?: number; intensity?: number; amplification?: boolean; reverse?: boolean }
        ): void;

        /**
         * A basic "pulse" animation which expands and contracts.
         * @param dt        Delta time
         * @param speed     The animation speed, from 1 to 10
         * @param intensity The animation intensity, from 1 to 10
         * @param reverse   Is the animation reversed?
         */
        animatePulse(dt: number, options?: { speed?: number; intensity?: number; reverse?: number }): void;

        /* -------------------------------------------- */
        /*  Visibility Testing                          */
        /* -------------------------------------------- */

        /**
         * Test whether this LightSource provides visibility to see a certain target object.
         * @param config The visibility test configuration
         * @param config.tests   The sequence of tests to perform
         * @param config.object  The target object being tested
         * @returns Is the target object visible to this source?
         */
        testVisibility(config: { tests: CanvasVisibilityTest[]; object: PlaceableObject }): boolean;

        /**
         * Can this LightSource theoretically detect a certain object based on its properties?
         * This check should not consider the relative positions of either object, only their state.
         * @param target The target object being tested
         * @returns Can the target object theoretically be detected by this vision source?
         */
        protected _canDetectObject(target: PlaceableObject): boolean;
    }

    /**
     * A specialized subclass of the LightSource which is used to render global light source linked to the scene.
     */
    class GlobalLightSource extends LightSource<null> {
        protected override _createPolygon(): PointSourcePolygon;

        protected override _configureSoftEdges(): void;

        protected override _initialize(data?: Partial<LightSourceData>): void;
    }

    interface LightSourceData extends RenderedPointSourceData {
        /** An opacity for the emitted light, if any */
        alpha: number;
        /** An animation configuration for the source */
        animation: object;
        /** The allowed radius of bright vision or illumination */
        bright: number;
        /** The coloration technique applied in the shader */
        coloration: number;
        /** The amount of contrast this light applies to the background texture */
        contrast: number;
        /** The allowed radius of dim vision or illumination */
        dim: number;
        /** Strength of the attenuation between bright, dim, and dark */
        attenuation: number;
        /** The luminosity applied in the shader */
        luminosity: number;
        /** The amount of color saturation this light applies to the background texture */
        saturation: number;
        /** The depth of shadows this light applies to the background texture */
        shadows: number;
        /** Whether or not this source provides a source of vision */
        vision: boolean;
    }

    interface LightSourceMeshes {
        background: PIXI.Mesh | null;
        light: PIXI.Mesh | null;
        color: PIXI.Mesh | null;
    }
}

interface LightAnimationConfiguration {
    label: string;
    animation: Function;
    /* A custom illumination shader used by this animation */
    illuminationShader: PIXI.Shader;
    /* A custom coloration shader used by this animation */
    colorationShader: PIXI.Shader;
    /* A custom background shader used by this animation */
    backgroundShader: PIXI.Shader;
    /** The animation seed */
    seed?: number;
    /** The animation time */
    time?: number;
}

interface ARParameters {
    phi?: number;
    center?: number;
    sigma?: number;
    max?: number | null;
    min?: number | null;
}
