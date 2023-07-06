import type { Document, DataModel } from "../abstract/module.d.ts";
import type { BaseActor } from "../documents/module.d.ts";
import type { TokenBarData, TokenSource } from "../documents/token.d.ts";
import type * as fields from "./fields.d.ts";

/**
 * An embedded data object which defines the properties of a light source animation
 * @property type      The animation type which is applied
 * @property speed     The speed of the animation, a number between 1 and 10
 * @property intensity The intensity of the animation, a number between 1 and 10
 */
export interface AnimationData {
    type: string;
    speed: number;
    intensity: number;
}

/**
 * An embedded data object which defines the darkness range during which some attribute is active
 * @property [min=0] The minimum darkness level for which activation occurs
 * @property [max=1] The maximum darkness level for which activation occurs
 */
export interface DarknessActivation {
    min: number;
    max: number;
}

/**
 * A reusable document structure for the internal data used to render the appearance of a light source.
 * This is re-used by both the AmbientLightData and TokenData classes.
 *
 * @property alpha       An opacity for the emitted light, if any
 * @property animation   An animation configuration for the source
 * @property angle       The angle of emission for this point source
 * @property bright      The allowed radius of bright vision or illumination
 * @property color       A tint color for the emitted light, if any
 * @property coloration  The coloration technique applied in the shader
 * @property contrast    The amount of contrast this light applies to the background texture
 * @property darkness    A darkness range (min and max) for which the source should be active
 * @property dim         The allowed radius of dim vision or illumination
 * @property invertColor Does this source invert the color of the background texture?
 * @property gradual     Fade the difference between bright, dim, and dark gradually?
 * @property luminosity  The luminosity applied in the shader
 * @property saturation  The amount of color saturation this light applies to the background texture
 * @property shadows     The depth of shadows this light applies to the background texture
 */
export class LightData extends DataModel<DataModel | null, LightDataSchema> {
    static override defineSchema(): LightDataSchema;

    static override migrateData<TSource extends object>(source: TSource): TSource;
}

export interface LightData
    extends DataModel<DataModel | null, LightDataSchema>,
        ModelPropsFromSchema<LightDataSchema> {}

export type LightSource = SourceFromSchema<LightDataSchema>;

type LightDataSchema = {
    alpha: fields.AlphaField;
    angle: fields.AngleField;
    bright: fields.NumberField<number, number, true, false, true>;
    color: fields.ColorField;
    coloration: fields.NumberField<number, number, true>;
    dim: fields.NumberField<number, number, true>;
    attenuation: fields.NumberField<number, number, true>;
    luminosity: fields.NumberField<number, number, true, false, true>;
    saturation: fields.NumberField<number, number, true, false, true>;
    contrast: fields.NumberField<number, number, true, false, true>;
    shadows: fields.NumberField<number, number, true, false, true>;
    animation: fields.SchemaField<{
        type: fields.StringField<string, string, true, true, true>;
        speed: fields.NumberField<number, number, true>;
        intensity: fields.NumberField<number, number, true>;
        reverse: fields.BooleanField;
    }>;
    darkness: fields.SchemaField<{
        min: fields.AlphaField;
        speed: fields.AlphaField;
    }>;
};

export interface PrototypeTokenSource
    extends Omit<
        TokenSource,
        "_id" | "actorId" | "actorData" | "x" | "y" | "elevation" | "effects" | "overlayEffect" | "hidden"
    > {
    name: string;
    randomImg: boolean;
}

export class PrototypeToken<TParent extends BaseActor | null> extends Document<TParent> {
    get actor(): TParent;

    protected override _initialize(): void;

    override toJSON(): RawObject<this>;

    lightAnimation: AnimationData;

    bar1: TokenBarData;

    bar2: TokenBarData;
}

export interface PrototypeToken<TParent extends BaseActor | null>
    extends Document<TParent>,
        Omit<PrototypeTokenSource, "bar1" | "bar2"> {
    readonly _source: PrototypeTokenSource;
}

export interface TextureData {
    /** The URL of the texture source. */
    src: string | null;
    /** The scale of the texture in the X dimension. */
    scaleX: number;
    /** The scale of the texture in the Y dimension. */
    scaleY: number;
    /** The X offset of the texture with (0,0) in the top left. */
    offsetX: number;
    /** The Y offset of the texture with (0,0) in the top left. */
    offsetY: number;
    /** An angle of rotation by which this texture is rotated around its center. */
    rotation: number;
    /** An optional color string used to tint the texture. */
    tint: number | null;
}

/**
 * An embedded data object which defines the properties of a light source animation
 * @property mode     The occlusion mode from CONST.TILE_OCCLUSION_MODES
 * @property alpha    The occlusion alpha between 0 and 1
 * @property [radius] An optional radius of occlusion used for RADIAL mode
 */
export interface TileOcclusion {
    mode: TileOcclusionMode;
    alpha: number;
    radius?: number;
}

/**
 * An inner-object which defines the schema for how Tile video backgrounds are managed
 * @property loop     Automatically loop the video?
 * @property autoplay Should the video play automatically?
 * @property volume   The volume level of any audio that the video file contains
 */
export interface VideoData {
    loop: boolean;
    autoplay: boolean;
    volume: boolean;
}
