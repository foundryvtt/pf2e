import * as abstract from "../abstract/_module.mjs";
import * as fields from "../data/fields.mjs";
import BaseRegion from "./region.mjs";

/**
 * The RegionBehavior Document.
 * Defines the DataSchema and common behaviors for a RegionBehavior which are shared between both client and server.
 */
export default class BaseRegionBehavior<
    TParent extends BaseRegion | null = BaseRegion | null,
> extends abstract.Document<TParent, RegionBehaviorSchema> {
    /* -------------------------------------------- */
    /*  Model Configuration                         */
    /* -------------------------------------------- */

    static override get metadata(): Readonly<RegionBehaviorMetadata>;

    static override defineSchema(): RegionBehaviorSchema;

    static override LOCALIZATION_PREFIXES: string[];

    static override canUserCreate(user: foundry.documents.BaseUser): boolean;

    override getUserLevel(user: foundry.documents.BaseUser): CONST.DocumentOwnershipNumber;
}

export default interface BaseRegionBehavior<TParent extends BaseRegion | null = BaseRegion | null>
    extends abstract.Document<TParent, RegionBehaviorSchema>, fields.ModelPropsFromSchema<RegionBehaviorSchema> {
    get documentName(): RegionBehaviorMetadata["name"];
}

interface RegionBehaviorMetadata extends abstract.DocumentClassMetadata {
    name: "RegionBehavior";
    collection: "behaviors";
    label: "DOCUMENT.RegionBehavior";
    labelPlural: "DOCUMENT.RegionBehaviors";
    coreTypes: [
        "adjustDarknessLevel",
        "applyActiveEffect",
        "changeLevel",
        "defineSurface",
        "displayScrollingText",
        "executeMacro",
        "executeScript",
        "modifyMovementCost",
        "pauseGame",
        "suppressWeather",
        "teleportToken",
        "toggleBehavior",
    ];
    hasTypeData: true;
    isEmbedded: true;
}

type RegionBehaviorSchema<TType extends string = string, TSystemData extends object = object> = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, true>;
    type: fields.DocumentTypeField<TType>;
    system: fields.TypeDataField<TSystemData>;
    disabled: fields.BooleanField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

export type RegionBehaviorSource<
    TType extends string = string,
    TSystemData extends object = object,
> = fields.SourceFromSchema<RegionBehaviorSchema<TType, TSystemData>>;
