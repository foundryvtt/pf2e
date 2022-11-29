export {};

declare global {
    /**
     * A specialized subclass of the PointSource abstraction which is used to control the rendering of light sources.
     * @param object The light-emitting object that generates this light source
     */
    class LightSource<TObject extends AmbientLight | Token | undefined> extends PointSource<TObject> {
        constructor(object: TObject);

        /** The light or darkness container for this source */
        background: PIXI.Mesh;

        /** The light or darkness container for this source */
        illumination: PIXI.Mesh;

        /** This visible color container for this source */
        coloration: PIXI.Mesh;

        static sourceType: string;

        /** Strength of the blur for light source edges */
        static BLUR_STRENGTH: number;

        /** Keys in the LightSourceData structure which, when modified, change the appearance of the light */
        protected static _appearanceKeys: string[];

        /* -------------------------------------------- */
        /*  Light Source Attributes                     */
        /* -------------------------------------------- */

        /** The object of data which configures how the source is rendered */
        override data: LightSourceData;

        /** The animation configuration applied to this source */
        animation: Partial<LightAnimationConfiguration>;

        /** Internal flag for whether this is a darkness source */
        isDarkness: boolean;

        /** The rendered field-of-vision texture for the source for use within shaders. */
        fovTexture: PIXI.RenderTexture | null;

        /** To know if a light source is a preview or not. False by default. */
        preview: boolean;

        /** The ratio of dim:bright as part of the source radius */
        ratio: number;

        /** Track which uniforms need to be reset */
        _resetUniforms: {
            background: boolean;
            illumination: boolean;
            coloration: boolean;
        };

        /** To track if a source is temporarily shutdown to avoid glitches */
        _shutdown: {
            illumination: boolean;
        };

        /** Undocumented */
        colorRGB: [number, number, number];

        /* -------------------------------------------- */
        /*  Light Source Initialization                 */
        /* -------------------------------------------- */

        /**
         * Initialize the source with provided object data.
         * @param data Initial data provided to the point source
         * @return A reference to the initialized source
         */
        initialize(data?: Partial<LightSourceData>): this;

        protected _getPolygonConfiguration(): {
            type: "light" | "universal";
            angle: number;
            density: number;
            radius: number;
            rotation: number;
            source: LightSource<TObject>;
        };

        /**
         * Initialize the PointSource with new input data
         * @param data Initial data provided to the light source
         * @returns The changes compared to the prior data
         */
        _initializeData(data: Partial<LightSourceData>): Partial<LightSourceData>;

        /** Initialize the shaders used for this source, swapping to a different shader if the animation has changed. */
        protected _initializeShaders(): void;

        /** Initialize the blend mode and vertical sorting of this source relative to others in the container. */
        _initializeBlending(): void;

        /* -------------------------------------------- */
        /*  Light Source Rendering                      */
        /* -------------------------------------------- */

        /** Render the containers used to represent this light source within the LightingLayer */
        drawMeshes(): LightSourceMeshes;

        /**
         * Draw the display of this source for background container.
         * @return The rendered light container
         */
        drawBackground(): PIXI.Mesh | null;

        /**
         * Draw the display of this source for the darkness/light container of the SightLayer.
         * @return The rendered light container
         */
        drawLight(): PIXI.Mesh | null;

        /**
         * Draw and return a container used to depict the visible color tint of the light source on the LightingLayer
         * @return An updated color container for the source
         */
        drawColor(): PIXI.Mesh | null;

        /* -------------------------------------------- */
        /*  Shader Management                           */
        /* -------------------------------------------- */

        /**
         * Update shader uniforms by providing data from this PointSource
         * @param shader The shader being updated
         */
        protected _updateColorationUniforms(shader: PIXI.Shader): void;
        /**
         * Update shader uniforms by providing data from this PointSource
         * @param shader The shader being updated
         */
        _updateIlluminationUniforms(shader: PIXI.Shader): void;

        /**
         * Update shader uniforms by providing data from this PointSource
         * @param shader The shader being updated
         */
        protected _updateBackgroundUniforms(shader: PIXI.Shader): void;

        /**
         * Update shader uniforms shared by all shader types
         * @param shader The shader being updated
         */
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
         * Animate the PointSource, if an animation is enabled and if it currently has rendered containers.
         * @param dt Delta time
         */
        animate(dt: number): void;

        /**
         * A torch animation where the luminosity and coloration decays each frame and is revitalized by flashes
         * @param dt        Delta time
         * @param speed     The animation speed, from 1 to 10
         * @param intensity The animation intensity, from 1 to 10
         */
        animateTorch(dt: number, { speed, intensity }?: { speed?: number; intensity?: number }): void;

        /**
         * A basic "pulse" animation which expands and contracts.
         * @param dt        Delta time
         * @param speed     The animation speed, from 1 to 10
         * @param intensity The animation intensity, from 1 to 10
         * @param reverse   Is the animation reversed?
         */
        animatePulse(
            dt: number,
            { speed, intensity, reverse }?: { speed?: number; intensity?: number; reverse?: number }
        ): void;

        /**
         * Emanate waves of light from the source origin point
         * @param dt        Delta time
         * @param speed     The animation speed, from 1 to 10
         * @param intensity The animation intensity, from 1 to 10
         * @param reverse   Is the animation reversed?
         */
        animateTime(
            dt: number,
            { speed, intensity, reverse }?: { speed?: number; intensity?: number; reverse?: number }
        ): void;

        /**
         * Evolve a value using a stochastic AR(1) process
         * @param y      The current value
         * @param phi    The decay rate of prior values
         * @param center The stationary mean of the series
         * @param sigma  The volatility of the process - standard deviation of the error term
         * @param max    The maximum allowed outcome, or null
         * @param min    The minimum allowed outcome, or null
         * @return The new value of the process
         */
        protected _ar1(y: number, { phi, center, sigma, max, min }?: ARParameters): number;
    }

    interface LightSourceData {
        /** The x-coordinate of the source location */
        x: number;
        /** The y-coordinate of the source location */
        y: number;
        /** An optional z-index sorting for the source */
        z?: number;
        /** The angle of rotation for this point source */
        rotation: number;
        /** An opacity for the emitted light, if any */
        alpha: number;
        /** An animation configuration for the source */
        animation: object;
        /** The angle of emission for this point source */
        angle: number;
        /** The allowed radius of bright vision or illumination */
        bright: number;
        /** A tint color for the emitted light, if any */
        color: number;
        /** The coloration technique applied in the shader */
        coloration: number;
        /** The amount of contrast this light applies to the background texture */
        contrast: number;
        /** A darkness range (min and max) for which the source should be active */
        darkness: { min: number; max: number };
        /** The allowed radius of dim vision or illumination */
        dim: number;
        /** Fade the difference between bright, dim, and dark gradually? */
        gradual: boolean;
        /** The luminosity applied in the shader */
        luminosity: number;
        /** The amount of color saturation this light applies to the background texture */
        saturation: number;
        /** The depth of shadows this light applies to the background texture */
        shadows: number;
        /** Whether or not the source is constrained by walls */
        walls: boolean;
        /** Whether or not this source provides a source of vision */
        vision: boolean;
        /** An integer seed to synchronize (or de-synchronize) animations */
        seed: number;
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
