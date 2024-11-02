import type { DataSchema } from "../data/fields.d.ts";
import type * as packages from "../packages/module.d.ts";
import type * as abstract from "./module.d.ts";
/**
 * A specialized subclass of DataModel, intended to represent a Document's type-specific data.
 * Systems or Modules that provide DataModel implementations for sub-types of Documents (such as Actors or Items)
 * should subclass this class instead of the base DataModel class.
 *
 * @see {@link Document}
 * @extends {DataModel}
 * @abstract
 *
 * @example Registering a custom sub-type for a Module.
 *
 * **module.json**
 * ```json
 * {
 *   "id": "my-module",
 *   "esmodules": ["main.mjs"],
 *   "documentTypes": {
 *     "Actor": {
 *       "sidekick": {},
 *       "villain": {}
 *     },
 *     "JournalEntryPage": {
 *       "dossier": {},
 *       "quest": {
 *         "htmlFields": ["description"]
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * **main.mjs**
 * ```js
 * Hooks.on("init", () => {
 *   Object.assign(CONFIG.Actor.dataModels, {
 *     "my-module.sidekick": SidekickModel,
 *     "my-module.villain": VillainModel
 *   });
 *   Object.assign(CONFIG.JournalEntryPage.dataModels, {
 *     "my-module.dossier": DossierModel,
 *     "my-module.quest": QuestModel
 *   });
 * });
 *
 * class QuestModel extends foundry.abstract.TypeDataModel {
 *   static defineSchema() {
 *     const fields = foundry.data.fields;
 *     return {
 *       description: new fields.HTMLField({required: false, blank: true, initial: ""}),
 *       steps: new fields.ArrayField(new fields.StringField())
 *     };
 *   }
 *
 *   prepareDerivedData() {
 *     this.totalSteps = this.steps.length;
 *   }
 * }
 * ```
 */
export default abstract class TypeDataModel<
    TParent extends abstract.DataModel | null,
    TSchema extends DataSchema,
> extends abstract.DataModel<TParent, TSchema> {
    /** The package that is providing this DataModel for the given sub-type. */
    readonly modelProvider: packages.BaseSystem | packages.BaseModule | null;

    /** A set of localization prefix paths which are used by this data model. */
    static LOCALIZATION_PREFIXES: string[];

    constructor(data?: object, options?: DataModelConstructionOptions<abstract.Document | null>);

    /** Prepare data related to this DataModel itself, before any derived data is computed. */
    prepareBaseData(): void;

    /**
     * Apply transformations of derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;
}
