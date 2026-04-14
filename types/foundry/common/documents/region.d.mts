import {
    DatabaseUpdateCallbackOptions,
    Document,
    DocumentMetadata,
    EmbeddedCollection,
} from "@common/abstract/_module.mjs";
import { DocumentOwnershipNumber, EdgeRestrictionType, RegionVisibilityType } from "../constants.mjs";
import { BaseShapeData } from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseRegionBehavior, BaseScene, BaseUser } from "./_module.mjs";

export default class BaseRegion<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    RegionSchema
> {
    static override get metadata(): RegionMetadata;

    static override defineSchema(): RegionSchema;

    static override LOCALIZATION_PREFIXES: string[];

    /* -------------------------------------------- */
    /*  Model Methods                               */
    /* -------------------------------------------- */

    static override canUserCreate(user: BaseUser): boolean;

    /* -------------------------------------------- */
    /*  Document Methods                            */
    /* -------------------------------------------- */

    override getUserLevel(user: BaseUser): DocumentOwnershipNumber;

    /* -------------------------------------------- */
    /*  Database Update Operations                  */
    /* -------------------------------------------- */

    protected override _preUpdate(
        changes: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<void>;
}

export default interface BaseRegion<TParent extends BaseScene | null = BaseScene | null>
    extends Document<TParent, RegionSchema>, fields.ModelPropsFromSchema<RegionSchema> {
    get documentName(): RegionMetadata["name"];

    readonly behaviors: EmbeddedCollection<BaseRegionBehavior<this>>;
}

interface RegionMetadata extends DocumentMetadata {
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
    /** The elevation */
    elevation: fields.SchemaField<RegionElevationSchema>;
    /** The level IDs */
    levels: fields.SceneLevelsSetField;
    restriction: fields.SchemaField<{
        enabled: fields.BooleanField;
        type: fields.StringField<EdgeRestrictionType, EdgeRestrictionType, true, false, true>;
        priority: fields.NumberField<number, number, true, false, true>;
    }>;
    attachment: fields.SchemaField<{
        token: fields.ForeignDocumentField<string>;
    }>;
    /** A collection of embedded RegionBehavior objects */
    behaviors: fields.EmbeddedCollectionField<BaseRegionBehavior<BaseRegion>>;
    visibility: fields.NumberField<RegionVisibilityType, RegionVisibilityType, true>;
    highlightMode: fields.StringField<RegionHighlightMode, RegionHighlightMode, true, false, true>;
    displayMeasurements: fields.BooleanField;
    /** Whether this region is locked or not */
    locked: fields.BooleanField;
    ownership: fields.DocumentOwnershipField;
    /** An object of optional key/value flags */
    flags: fields.DocumentFlagsField;
    /** @internal */
    _shapeConstraints: fields.ArrayField<
        fields.ArrayField<fields.NumberField<number, number, true, false, false>, number[], number[], true, true, true>
    >;
};

export type RegionHighlightMode = "shapes" | "coverage";

type RegionElevationSchema = {
    /** null -> -Infinity */
    bottom: fields.NumberField<number, number, true>;
    /** null -> +Infinity */
    top: fields.NumberField<number, number, true>;
};

export type RegionSource = fields.SourceFromSchema<RegionSchema>;

export {};
