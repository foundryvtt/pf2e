import type DataModel from "../abstract/data.d.ts";
import type * as documents from "../documents/module.d.ts";
import type { TokenSchema } from "../documents/token.d.ts";
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
 */
export class LightData extends DataModel<DataModel | null, LightDataSchema> {
    static override defineSchema(): LightDataSchema;

    static override migrateData<TSource extends Record<string, JSONValue>>(source: TSource): TSource;
}

export interface LightData
    extends DataModel<DataModel | null, LightDataSchema>,
        ModelPropsFromSchema<LightDataSchema> {}

export type LightSource = SourceFromSchema<LightDataSchema>;

type LightDataSchema = {
    /** An opacity for the emitted light, if any */
    alpha: fields.AlphaField;
    /** The angle of emission for this point source */
    angle: fields.AngleField;
    /** The allowed radius of bright vision or illumination */
    bright: fields.NumberField<number, number, true, false, true>;
    /** A tint color for the emitted light, if any */
    color: fields.ColorField;
    /** The coloration technique applied in the shader */
    coloration: fields.NumberField<number, number, true>;
    /** The allowed radius of dim vision or illumination */
    dim: fields.NumberField<number, number, true>;
    /** Fade the difference between bright, dim, and dark gradually? */
    attenuation: fields.NumberField<number, number, true>;
    /** The luminosity applied in the shader */
    luminosity: fields.NumberField<number, number, true, false, true>;
    /** The amount of color saturation this light applies to the background texture */
    saturation: fields.NumberField<number, number, true, false, true>;
    /** The amount of contrast this light applies to the background texture */
    contrast: fields.NumberField<number, number, true, false, true>;
    /** The depth of shadows this light applies to the background texture */
    shadows: fields.NumberField<number, number, true, false, true>;
    /** An animation configuration for the source */
    animation: fields.SchemaField<{
        type: fields.StringField<string, string, true, true, true>;
        speed: fields.NumberField<number, number, true>;
        intensity: fields.NumberField<number, number, true>;
        reverse: fields.BooleanField;
    }>;
    /** A darkness range (min and max) for which the source should be active */
    darkness: fields.SchemaField<{
        min: fields.AlphaField;
        speed: fields.AlphaField;
    }>;
};

/** A data model intended to be used as an inner EmbeddedDataField which defines a geometric shape. */
export class ShapeData<TParent extends DataModel | null> extends DataModel<TParent, ShapeDataSchema> {
    static override defineSchema(): ShapeDataSchema;

    /** The primitive shape types which are supported */
    static TYPES: {
        RECTANGLE: "r";
        CIRCLE: "c";
        ELLIPSE: "e";
        POLYGON: "p";
    };
}

export interface ShapeData<TParent extends DataModel | null>
    extends DataModel<TParent, ShapeDataSchema>,
        ModelPropsFromSchema<ShapeDataSchema> {}

type ShapeDataSchema = {
    /**
     * The type of shape, a value in ShapeData.TYPES.
     * For rectangles, the x/y coordinates are the top-left corner.
     * For circles, the x/y coordinates are the center of the circle.
     * For polygons, the x/y coordinates are the first point of the polygon.
     */
    type: fields.StringField<ValueOf<typeof ShapeData.TYPES>, ValueOf<typeof ShapeData.TYPES>, true, false, true>;
    /** For rectangles, the pixel width of the shape. */
    width: fields.NumberField;
    /** For rectangles, the pixel height of the shape. */
    height: fields.NumberField;
    /** For circles, the pixel radius of the shape. */
    radius: fields.NumberField;
    /** For polygons, the array of polygon coordinates which comprise the shape. */
    points: fields.ArrayField<fields.NumberField<number, number, true, false>>;
};

/** A {@link fields.SchemaField} subclass used to represent texture data. */
export class TextureData extends fields.SchemaField<TextureDataSchema> {
    /**
     * @param options    Options which are forwarded to the SchemaField constructor
     * @param srcOptions Additional options for the src field
     */
    constructor(
        options?: fields.DataFieldOptions<SourceFromSchema<TextureDataSchema>, true, false, true>,
        srcOptions?: {
            categories?: ("IMAGE" | "VIDEO")[];
            initial?: "IMAGE" | "VIDEO" | null;
            wildcard?: boolean;
            label?: string;
        },
    );
}

type TextureDataSchema = {
    /** The URL of the texture source. */
    src: fields.FilePathField<ImageFilePath | VideoFilePath, ImageFilePath | VideoFilePath, true, false, true>;
    /** The scale of the texture in the X dimension. */
    scaleX: fields.NumberField<number, number, false, false>;
    /** The scale of the texture in the Y dimension. */
    scaleY: fields.NumberField<number, number, false, false>;
    /** The X offset of the texture with (0,0) in the top left. */
    offsetX: fields.NumberField<number, number, false, false>;
    /** The Y offset of the texture with (0,0) in the top left. */
    offsetY: fields.NumberField<number, number, false, false>;
    /** An angle of rotation by which this texture is rotated around its center. */
    rotation: fields.AngleField;
    /** An optional color string used to tint the texture. */
    tint: fields.ColorField;
};

export class PrototypeToken<TParent extends documents.BaseActor | null> extends DataModel<
    TParent,
    PrototypeTokenSchema
> {
    constructor(data: DeepPartial<PrototypeTokenSource>, options?: DataModelConstructionOptions<TParent>);

    static override defineSchema(): PrototypeTokenSchema;

    get actor(): TParent;

    protected override _initialize(): void;

    override toJSON(): this["_source"];
}

export interface PrototypeToken<TParent extends documents.BaseActor | null>
    extends DataModel<TParent, PrototypeTokenSchema>,
        ModelPropsFromSchema<PrototypeTokenSchema> {}

type PrototypeTokenSchema = Omit<
    TokenSchema,
    "_id" | "name" | "actorId" | "delta" | "x" | "y" | "elevation" | "effects" | "overlayEffect" | "hidden"
> & {
    name: fields.StringField<string, string, true, false, true>;
    randomImg: fields.BooleanField;
};

export type PrototypeTokenSource = SourceFromSchema<PrototypeTokenSchema>;

/**
 * A minimal data model used to represent a tombstone entry inside an {@link EmbeddedCollectionDelta}.
 * @see {EmbeddedCollectionDelta}
 *
 * @property _id        The _id of the base Document that this tombstone represents.
 * @property _tombstone A property that identifies this entry as a tombstone.
 * @property [_stats]   An object of creation and access information.
 */
export class TombstoneData<
    TParent extends documents.BaseActorDelta<documents.BaseToken<documents.BaseScene | null> | null> | null,
> extends DataModel<TParent, TombstoneDataSchema> {
    static override defineSchema(): TombstoneDataSchema;
}

export interface TombstoneData<
    TParent extends documents.BaseActorDelta<documents.BaseToken<documents.BaseScene | null> | null> | null,
> extends DataModel<TParent, TombstoneDataSchema>,
        SourceFromSchema<TombstoneDataSchema> {
    readonly _source: TombstoneSource;
}

export type TombstoneSource<TDocumentId extends string | null = string | null> = Omit<
    SourceFromSchema<TombstoneDataSchema>,
    "_id"
> & {
    _id: TDocumentId;
};

export type TombstoneDataSchema = {
    _id: fields.DocumentIdField;
    _tombstone: fields.BooleanField<true, true>;
    _stats: fields.DocumentStatsField;
};

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
