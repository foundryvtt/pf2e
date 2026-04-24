import {
    DatabaseUpdateCallbackOptions,
    Document,
    DocumentClassMetadata,
    EmbeddedCollection,
} from "@common/abstract/_module.mjs";
import { DocumentOwnershipNumber, EdgeRestrictionType, RegionVisibilityType } from "../constants.mjs";
import { BaseShapeData } from "../data/data.mjs";
import * as fields from "../data/fields.mjs";
import { BaseRegionBehavior, BaseScene, BaseUser } from "./_module.mjs";

/**
 * The Region Document.
 * Defines the DataSchema and common behaviors for a Region which are shared between both client and server.
 * @category Documents
 */
export default class BaseRegion<TParent extends BaseScene | null = BaseScene | null> extends Document<
    TParent,
    RegionSchema
> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<RegionMetadata>;

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

interface RegionMetadata extends DocumentClassMetadata {
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
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    color: fields.ColorField<true, false, false>;
    shapes: fields.ArrayField<fields.TypedSchemaField<typeof BaseShapeData.TYPES>>;
    elevation: fields.SchemaField<RegionElevationSchema>;
    levels: fields.SceneLevelsSetField;
    restriction: fields.SchemaField<{
        enabled: fields.BooleanField;
        type: fields.StringField<EdgeRestrictionType, EdgeRestrictionType, true, false, true>;
        priority: fields.NumberField<number, number, true, false, true>;
    }>;
    attachment: fields.SchemaField<{
        token: fields.ForeignDocumentField<string>;
    }>;
    behaviors: fields.EmbeddedCollectionField<BaseRegionBehavior<BaseRegion>>;
    visibility: fields.NumberField<RegionVisibilityType, RegionVisibilityType, true>;
    highlightMode: fields.StringField<RegionHighlightMode, RegionHighlightMode, true, false, true>;
    displayMeasurements: fields.BooleanField;
    hidden: fields.BooleanField;
    locked: fields.BooleanField;
    ownership: fields.DocumentOwnershipField;
    flags: fields.DocumentFlagsField;
    /** @internal */
    _shapeConstraints: fields.ArrayField<
        fields.ArrayField<fields.NumberField<number, number, true, false, false>, number[], number[], true, true, true>
    >;
};

export type RegionHighlightMode = "shapes" | "coverage";

type RegionElevationSchema = {
    bottom: fields.NumberField<number, number, true>;
    top: fields.NumberField<number, number, true>;
};

export type RegionSource = fields.SourceFromSchema<RegionSchema>;
