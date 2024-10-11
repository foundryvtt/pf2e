import type { PointVisionSource } from "../../../client-esm/canvas/sources/module.d.ts";
import type * as fields from "../../../common/data/fields.d.ts";

declare global {
    class ShaderField extends foundry.data.fields.DataField {
        override _cast(value: unknown): unknown;
    }

    /**
     * A Vision Mode which can be selected for use by a Token.
     * The selected Vision Mode alters the appearance of various aspects of the canvas while that Token is the POV.
     */
    class VisionMode extends foundry.abstract.DataModel<null, VisionModeSchema> {
        /**
         * Construct a Vision Mode using provided configuration parameters and callback functions.
         * @param data      Data which fulfills the model defined by the VisionMode schema.
         * @param [options] Additional options passed to the DataModel constructor.
         */
        constructor(data?: object, options?: { animated?: boolean });

        static override defineSchema(): VisionModeSchema;

        /** The lighting illumination levels which are supported. */
        static LIGHTING_LEVELS: {
            DARKNESS: -2;
            HALFDARK: -1;
            UNLIT: 0;
            DIM: 1;
            BRIGHT: 2;
            BRIGHTEST: 3;
        };

        /**
         * Flags for how each lighting channel should be rendered for the currently active vision modes:
         * - Disabled: this lighting layer is not rendered, the shaders does not decide.
         * - Enabled: this lighting layer is rendered normally, and the shaders can choose if they should be rendered or not.
         * - Required: the lighting layer is rendered, the shaders does not decide.
         */
        static LIGHTING_VISIBILITY: {
            DISABLED: 0;
            ENABLED: 1;
            REQUIRED: 2;
        };

        /** A flag for whether this vision source is animated */
        animated: boolean;

        /**
         * Does this vision mode enable light sources?
         * True unless it disables lighting entirely.
         */
        get perceivesLight(): boolean;

        /**
         * Special activation handling that could be implemented by VisionMode subclasses
         * @param source   Activate this VisionMode for a specific source
         */
        _activate(source: PointVisionSource): void;

        /**
         * Special deactivation handling that could be implemented by VisionMode subclasses
         * @param source   Deactivate this VisionMode for a specific source
         */
        protected _deactivate(source: PointVisionSource): void;

        /**
         * Special handling which is needed when this Vision Mode is activated for a VisionSource.
         * @param source Activate this VisionMode for a specific source
         */
        activate(source: PointVisionSource<Token>): void;

        /**
         * Special handling which is needed when this Vision Mode is deactivated for a VisionSource.
         * @param source Deactivate this VisionMode for a specific source
         */
        deactivate(source: PointVisionSource<Token>): void;

        /**
         * An animation function which runs every frame while this Vision Mode is active.
         * @param dt The deltaTime passed by the PIXI Ticker
         */
        animate(dt: number): Promise<void>;
    }

    interface VisionMode
        extends foundry.abstract.DataModel<null, VisionModeSchema>,
            ModelPropsFromSchema<VisionModeSchema> {}

    type LightingVisibility = (typeof VisionMode.LIGHTING_VISIBILITY)[keyof typeof VisionMode.LIGHTING_VISIBILITY];
}

type ShaderSchema = fields.SchemaField<{
    shader: ShaderField;
    uniforms: fields.ObjectField<object>;
}>;

type LightingSchema = fields.SchemaField<{
    visibility: fields.NumberField;
    postProcessingModes: fields.ArrayField<fields.StringField>;
    uniforms: fields.ObjectField<object>;
}>;

type VisionModeSchema = {
    id: fields.StringField;
    label: fields.StringField;
    tokenConfig: fields.BooleanField;
    canvas: fields.SchemaField<{
        shader: ShaderField;
        uniforms: fields.ObjectField<object>;
    }>;
    lighting: fields.SchemaField<{
        background: LightingSchema;
        coloration: LightingSchema;
        illumination: LightingSchema;
        darkness: LightingSchema;
        levels: fields.ObjectField<object>;
        multipliers: fields.ObjectField<object>;
    }>;
    vision: fields.SchemaField<{
        background: ShaderSchema;
        coloration: ShaderSchema;
        illumination: ShaderSchema;
        darkness: fields.SchemaField<{
            adaptive: fields.BooleanField;
        }>;
        defaults: fields.SchemaField<{
            color: fields.ColorField;
            attenuation: fields.AlphaField;
            brightness: fields.NumberField;
            saturation: fields.NumberField;
            contrast: fields.NumberField;
        }>;
        preferred: fields.BooleanField;
    }>;
};
