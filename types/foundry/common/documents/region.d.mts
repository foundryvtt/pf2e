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
    /** The _id which uniquely identifies this Region document */
    _id: fields.DocumentIdField;
    /** The name of this Region */
    name: fields.StringField<string, string, true, false, false>;
    /** The color used to highlight the Region */
    color: fields.ColorField<true, false, false>;
    /** The shapes that make up the Region */
    shapes: fields.ArrayField<fields.TypedSchemaField<typeof BaseShapeData.TYPES>>;
    /** The elevation of this Region */
    elevation: fields.SchemaField<RegionElevationSchema>;
    /** An array of Levels that this Region is on */
    levels: fields.SceneLevelsSetField;
    /** Data related to if this Region is restricted by walls */
    restriction: fields.SchemaField<{
        enabled: fields.BooleanField;
        type: fields.StringField<EdgeRestrictionType, EdgeRestrictionType, true, false, true>;
        priority: fields.NumberField<number, number, true, false, true>;
    }>;
    /** Data related to which Token this Region is attached to */
    attachment: fields.SchemaField<{
        token: fields.ForeignDocumentField<string>;
    }>;
    /** An EmbeddedCollection of RegionBehavior documents */
    behaviors: fields.EmbeddedCollectionField<BaseRegionBehavior<BaseRegion>>;
    /** When is this Region visible, see CONST.REGION_VISIBILITY */
    visibility: fields.NumberField<RegionVisibilityType, RegionVisibilityType, true>;
    /** Are the true shapes of this Region highlighted, or are the grid spaces fully in the Region highlighted */
    highlightMode: fields.StringField<RegionHighlightMode, RegionHighlightMode, true, false, true>;
    /** Are the measurements of this Region visible? */
    displayMeasurements: fields.BooleanField;
    /** Is this Region currently hidden? */
    hidden: fields.BooleanField;
    /** Is this Region currently locked? */
    locked: fields.BooleanField;
    /** An object which configures ownership of this Actor */
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
    bottom: fields.NumberField<number, number, true>;
    top: fields.NumberField<number, number, true>;
};

export type RegionSource = fields.SourceFromSchema<RegionSchema>;
