import * as fields from "../data/fields.mjs";
import * as packages from "./_module.mjs";

/**
 * The data schema used to define System manifest files.
 * Extends the basic PackageData schema with some additional system-specific fields.
 */
export default class BaseSystem extends packages.BasePackage<SystemSchema> {
    static override defineSchema(): SystemSchema;

    static override type: "system";

    /** The default icon used for this type of Package. */
    static icon: string;

    /** An alias for the document types available in the currently active World. */
    get documentTypes(): Record<"Actor" | "Item" | "RegionBehavior", Record<string, object>>;

    /** An alias for the raw template JSON loaded from the game System. */
    get template(): object;
}

export default interface BaseSystem
    extends packages.BasePackage<SystemSchema>,
        fields.ModelPropsFromSchema<SystemSchema> {
    version: string;
}

type SystemSchema = packages.BasePackageSchema & {
    background: fields.StringField<string, string, false, false, false>;
    initiative: fields.StringField;
    grid: fields.SchemaField<{
        type: fields.NumberField;
        distance: fields.NumberField;
        units: fields.StringField;
        diagonals: fields.NumberField;
    }>;
    primaryTokenAttribute: fields.StringField;
    secondaryTokenAttribute: fields.StringField;
};

export interface SystemSource extends fields.SourceFromSchema<SystemSchema> {}

export {};
