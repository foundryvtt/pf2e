import type * as abstract from "../abstract/module.d.ts";
import type * as fields from "../data/fields.d.ts";
import type BaseRegion from "./region.d.ts";

/**
 * The RegionBehavior Document.
 * Defines the DataSchema and common behaviors for a RegionBehavior which are shared between both client and server.
 */
export default class BaseRegionBehavior<
    TParent extends BaseRegion | null = BaseRegion | null,
> extends abstract.Document<TParent, RegionBehaviorSchema> {
    static override get metadata(): RegionBehaviorMetadata;

    static override defineSchema(): RegionBehaviorSchema;
}

export default interface BaseRegionBehavior<TParent extends BaseRegion | null = BaseRegion | null>
    extends abstract.Document<TParent, RegionBehaviorSchema>,
        ModelPropsFromSchema<RegionBehaviorSchema> {
    get documentName(): RegionBehaviorMetadata["name"];
}

interface RegionBehaviorMetadata extends abstract.DocumentMetadata {
    name: "RegionBehavior";
    collection: "behaviors";
    label: "DOCUMENT.RegionBehavior";
    labelPlural: "DOCUMENT.RegionBehaviors";
    coreTypes: [
        "adjustDarknessLevel",
        "executeMacro",
        "executeScript",
        "pauseGame",
        "suppressWeather",
        "teleportToken",
        "toggleBehavior",
    ];
    hasTypeData: true;
    isEmbedded: true;
}

type RegionBehaviorSchema<TType extends string = string, TSystemData extends object = object> = {
    /** The _id which uniquely identifies this RegionBehavior document */
    _id: fields.DocumentIdField;
    /** The name used to describe the RegionBehavior */
    name: fields.StringField<string, string, true, false, true>;
    /** A RegionBehavior subtype which configures the system data model applied */
    type: fields.DocumentTypeField<TType>;
    /** The system data object which is defined by the system template.json model */
    system: fields.TypeDataField<TSystemData>;
    /** Is the RegionBehavior currently disabled? */
    disabled: fields.BooleanField;
    /** An object of optional key/value flags */
    flags: fields.ObjectField<DocumentFlags>;
    /** An object of creation and access information */
    _stats: fields.DocumentStatsField;
};

export type RegionBehaviorSource<TType extends string = string, TSystemData extends object = object> = SourceFromSchema<
    RegionBehaviorSchema<TType, TSystemData>
>;
