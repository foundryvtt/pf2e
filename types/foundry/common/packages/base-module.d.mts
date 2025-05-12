import * as fields from "../data/fields.mjs";
import * as packages from "./_module.mjs";
import AdditionalTypesField from "./sub-types.mjs";

/**
 * The data schema used to define Module manifest files.
 * Extends the basic PackageData schema with some additional module-specific fields.
 * @property [coreTranslation] Does this module provide a translation for the core software?
 * @property [library]         A library module provides no user-facing functionality and is solely
 *                             for use by other modules. Loaded before any system or module scripts.
 * @property [documentTypes] Additional document sub-types provided by this module.
 */
export default class BaseModule extends packages.BasePackage<ModuleSchema> {
    static override defineSchema(): ModuleSchema;

    static override type: "module";

    /** The default icon used for this type of Package. */
    static icon: string;
}

export default interface BaseModule
    extends packages.BasePackage<ModuleSchema>,
        fields.ModelPropsFromSchema<ModuleSchema> {}

type ModuleSchema = packages.BasePackageSchema & {
    coreTranslation: fields.BooleanField;
    library: fields.BooleanField;
    documentTypes: AdditionalTypesField;
};

export interface ModuleSource extends fields.SourceFromSchema<ModuleSchema> {}

export {};
