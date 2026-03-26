import { HTMLDocumentEmbedElement } from "@client/applications/elements/_module.mjs";
import { DocumentHTMLEmbedConfig, EnrichmentOptions } from "@client/applications/ux/text-editor.mjs";
import User from "@client/documents/user.mjs";
import * as packages from "../packages/_module.mjs";
import * as abstract from "./_module.mjs";

/**
 * A specialized subclass of DataModel, intended to represent a Document's type-specific data.
 * Systems or Modules that provide DataModel implementations for sub-types of Documents (such as Actors or Items)
 * should subclass this class instead of the base DataModel class.
 *
 * @see {@link abstract.Document}
 * @extends {abstract.DataModel}
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
    TParent extends abstract.DataModel,
    TSchema extends abstract.DataSchema,
> extends abstract.DataModel<TParent, TSchema> {
    /** The package that is providing this DataModel for the given sub-type. */
    readonly modelProvider: packages.BaseSystem | packages.BaseModule | null;

    /** A set of localization prefix paths which are used by this data model. */
    static LOCALIZATION_PREFIXES: string[];

    constructor(data?: object, options?: abstract.DataModelConstructionContext<abstract.Document | null>);

    /** Prepare data related to this DataModel itself, before any derived data is computed. */
    prepareBaseData(): void;

    /**
     * Apply transformations of derivations to the values of the source data object.
     * Compute data fields whose values are not stored to the database.
     */
    prepareDerivedData(): void;

    /**
     * Convert this Document to some HTML display for embedding purposes.
     * @param config Configuration for embedding behavior.
     * @param options The original enrichment options for cases where the Document embed content also contains text that must be enriched.
     */
    toEmbed(
        config: DocumentHTMLEmbedConfig,
        options?: EnrichmentOptions,
    ): Promise<HTMLDocumentEmbedElement | HTMLElement | HTMLCollection | null>;

    /* -------------------------------------------- */
    /*  Database Operations                         */
    /* -------------------------------------------- */

    /**
     * Called by ClientDocument#_preCreate.
     *
     * @param data The initial data object provided to the document creation request
     * @param options Additional options which modify the creation request
     * @param user The User requesting the document creation
     * @returns Return false to exclude this Document from the creation operation
     */
    protected _preCreate(
        data: DeepPartial<TParent["_source"]>,
        options: abstract.DatabaseCreateCallbackOptions,
        user: User,
    ): Promise<boolean | void>;

    /* -------------------------------------------- */

    /**
     * Called by ClientDocument#_onCreate.
     *
     * @param data The initial data object provided to the document creation request
     * @param options Additional options which modify the creation request
     * @param userId The id of the User requesting the document update
     */
    protected _onCreate(
        data: DeepPartial<TParent["_source"]>,
        options: abstract.DatabaseCreateCallbackOptions,
        userId: string,
    ): void;

    /* -------------------------------------------- */

    /**
     * Called by ClientDocumentMixin#_preUpdate.
     *
     * @param changes The candidate changes to the Document
     * @param options Additional options which modify the update request
     * @param user The User requesting the document update
     * @returns A return value of false indicates the update operation should be cancelled.
     */
    protected _preUpdate(
        changes: Record<string, unknown>,
        options: abstract.DatabaseUpdateCallbackOptions,
        user: User,
    ): Promise<boolean | void>;

    /* -------------------------------------------- */

    /**
     * Called by ClientDocumentMixin#_onUpdate.
     *
     * @param changed The differential data that was changed relative to the documents prior values
     * @param options Additional options which modify the update request
     * @param userId The id of the User requesting the document update
     */
    protected _onUpdate(
        changed: DeepPartial<TParent["_source"]>,
        options: abstract.DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

    /* -------------------------------------------- */

    /**
     * Called by ClientDocumentMixin#_preDelete.
     *
     * @param options Additional options which modify the deletion request
     * @param user The User requesting the document deletion
     * @returns A return value of false indicates the deletion operation should be cancelled.
     */
    protected _preDelete(options: abstract.DatabaseDeleteCallbackOptions, user: User): Promise<boolean | void>;

    /* -------------------------------------------- */

    /**
     * Called by ClientDocumentMixin#_onDelete.
     *
     * @param options Additional options which modify the deletion request
     * @param userId The id of the User requesting the document update
     */
    protected _onDelete(options: abstract.DatabaseDeleteCallbackOptions, userId: string): void;
}
