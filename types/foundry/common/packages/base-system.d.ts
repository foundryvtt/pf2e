import type * as fields from "../data/fields.d.ts";
import type * as packages from "./module.d.ts";

/**
 * The data schema used to define System manifest files.
 * Extends the basic PackageData schema with some additional system-specific fields.
 * @property {string} [background]        A web URL or local file path which provides a default background banner for
 *                                        worlds which are created using this system
 * @property {string} [initiative]        A default initiative formula used for this system
 * @property {number} [gridDistance]      A default distance measurement to use for Scenes in this system
 * @property {string} [gridUnits]         A default unit of measure to use for distance measurement in this system
 * @property {string} [primaryTokenAttribute] An Actor data attribute path to use for Token primary resource bars
 * @property {string} [primaryTokenAttribute] An Actor data attribute path to use for Token secondary resource bars
 */
export default class BaseSystem extends packages.BasePackage<BaseSystemSchema> {
    static override type: "system";

    /** The default icon used for this type of Package. */
    static icon: string;

    /** An alias for the document types available in the currently active World. */
    get documentTypes(): Record<string, string[]>;

    /** An alias for the raw template JSON loaded from the game System. */
    get template(): object;

    /** An alias for the structured data model organized by document class and type. */
    get model(): Record<"Actor" | "Card" | "Cards" | "Item" | "JournalEntryPage", object>;
}

export default interface BaseSystem
    extends packages.BasePackage<BaseSystemSchema>,
        ModelPropsFromSchema<BaseSystemSchema> {
    version: string;
}

type BaseSystemSchema = packages.BasePackageSchema & {
    background: fields.StringField<string, string, false, false, false>;
    initiative: fields.StringField;
    gridDistance: fields.NumberField;
    gridUnits: fields.StringField;
    primaryTokenAttribute: fields.StringField;
    secondaryTokenAttribute: fields.StringField;
};
