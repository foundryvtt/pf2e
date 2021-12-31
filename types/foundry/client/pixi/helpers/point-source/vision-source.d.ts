export {};

declare global {
    /**
     * A specialized subclass of the PointSource abstraction which is used to control the rendering of vision sources.
     * @param object The Token object that generates this vision source
     */
    class VisionSource<TObject extends Token> extends PointSource<TObject> {
        constructor(object: TObject);

        /** The current vision mesh for this source */
        illumination: PIXI.Mesh<AdaptiveIlluminationShader>;

        static sourceType: "vision";

        /** Keys in the VisionSourceData structure which, when modified, change the appearance of the source */
        protected static _appearanceKeys: string[];

        /* -------------------------------------------- */
        /*  Vision Source Attributes                    */
        /* -------------------------------------------- */

        /** The object of data which configures how the source is rendered */
        data: VisionSourceData;

        /** The ratio of dim:bright as part of the source radius */
        ratio: number;

        /** The rendered field-of-vision texture for the source for use within shaders. */
        fovTexture: PIXI.RenderTexture | null;

        /** Track which uniforms need to be reset */
        _resetUniforms: { illumination: boolean };

        /** To track if a source is temporarily shutdown to avoid glitches */
        _shutdown: { illumination: boolean };

        // Store the FOV circle
        fov: PIXI.Circle;

        /* -------------------------------------------- */
        /*  Vision Source Initialization                */
        /* -------------------------------------------- */

        /**
         * Initialize the source with provided object data.
         * @param data Initial data provided to the point source
         * @return A reference to the initialized source
         */
        initialize(data?: Partial<VisionSourceData>): this;

        /** Initialize the blend mode and vertical sorting of this source relative to others in the container. */
        _initializeBlending(): void;

        /**
         * Process new input data provided to the LightSource.
         * @param data Initial data provided to the vision source
         * @returns The changes compared to the prior data
         */
        _initializeData(data: Partial<VisionSourceData>): void;

        /* -------------------------------------------- */
        /*  Vision Source Rendering                     */
        /* -------------------------------------------- */

        /**
         * Draw the display of this source to remove darkness from the LightingLayer illumination container.
         * @see {LightSource#drawLight}
         * @return The rendered light container
         */
        drawVision(): PIXI.Mesh<AdaptiveIlluminationShader> | null;

        /** Draw a Container used for exploring the FOV area of Token sight in the SightLayer */
        drawSight(): PIXI.Container;

        /**
         * Update shader uniforms by providing data from this PointSource
         * @param shader The shader being updated
         */
        _updateIlluminationUniforms(shader: AdaptiveIlluminationShader): void;

        override _drawRenderTextureContainer(): PIXI.Container;
    }

    interface VisionSourceData {
        /** The x-coordinate of the source location */
        x: number;
        /** The y-coordinate of the source location */
        y: number;
        /** An optional z-index sorting for the source */
        z?: number;
        /** The angle of rotation for this point source */
        rotation: number;
        /** The angle of emission for this point source */
        angle: number;
        /** The allowed radius of bright vision or illumination */
        bright: number;
        /** The allowed radius of dim vision or illumination */
        dim: number;
    }
}
