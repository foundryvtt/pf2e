import type * as abstract from "../abstract/module.d.ts";
import type { REGION_VISIBILITY } from "../constants.d.ts";
import type { BaseShapeData } from "../data/data.d.ts";
import type * as fields from "../data/fields.d.ts";
import type * as documents from "./module.d.ts";
import type BaseRegionBehavior from "./region-behavior.d.ts";

export default class BaseRegion<
    TParent extends documents.BaseScene | null = documents.BaseScene | null,
> extends abstract.Document<TParent, RegionSchema> {
    static override get metadata(): RegionMetadata;

    static override defineSchema(): RegionSchema;
}

export default interface BaseRegion<TParent extends documents.BaseScene | null = documents.BaseScene | null>
    extends abstract.Document<TParent, RegionSchema>,
        ModelPropsFromSchema<RegionSchema> {
    get documentName(): RegionMetadata["name"];

    readonly behaviors: abstract.EmbeddedCollection<BaseRegionBehavior<this>>;
}

interface RegionMetadata extends abstract.DocumentMetadata {
    name: "Region";
    collection: "regions";
    label: "DOCUMENT.Region";
    labelPlural: "DOCUMENT.Regions";
    isEmbedded: true;
    embedded: {
        RegionBehavior: "behaviors";
    };
}

type RegionSchema = {
    /** The Region _id which uniquely identifies it within its parent Scene */
    _id: fields.DocumentIdField;
    /** The name used to describe the Region */
    name: fields.StringField<string, string, true, false, false>;
    /** The color used to highlight the Region */
    color: fields.ColorField<true, false, false>;
    /** The shapes that make up the Region */
    shapes: fields.ArrayField<fields.TypedSchemaField<typeof BaseShapeData.TYPES>>;
    elevation: fields.SchemaField<RegionElevationSchema>;
    /** A collection of embedded RegionBehavior objects */
    behaviors: fields.EmbeddedCollectionField<BaseRegionBehavior<BaseRegion>>;
    visibility: fields.NumberField<RegionVisibilityValue, RegionVisibilityValue, true>;
    locked: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
};

type RegionElevationSchema = {
    /** null -> -Infinity */
    bottom: fields.NumberField<number, number, true>;
    /** null -> +Infinity */
    top: fields.NumberField<number, number, true>;
};

type RegionVisibilityValue = (typeof REGION_VISIBILITY)[keyof typeof REGION_VISIBILITY];

export type RegionSource = SourceFromSchema<RegionSchema>;
