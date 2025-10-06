import DataModel from "@common/abstract/data.mjs";
import { DataField, SchemaField } from "@common/data/fields.mjs";

/**
 * A helper class which assists with localization and string translation
 */
export default class Localization {
    /**
     * The target language for localization
     */
    lang: string;

    /**
     * The translation dictionary for the target language
     */
    translations: Record<string, TranslationDictionaryValue>;

    /**
     * Fallback translations if the target keys are not found
     */
    _fallback: Record<string, TranslationDictionaryValue>;

    /**
     * @param serverLanguage The default language configuration setting for the server
     */
    constructor(serverLanguage: string);

    /**
     * Initialize the Localization module
     * Discover available language translations and apply the current language setting
     */
    initialize(): Promise<void>;

    /* -------------------------------------------- */
    /*  Data Model Localization                     */
    /* -------------------------------------------- */

    /**
     * Perform one-time localization of the fields in a DataModel schema, translating their label and hint properties.
     * @param {typeof DataModel} model          The DataModel class to localize
     * @param {object} options                  Options which configure how localization is performed
     * @param {string[]} [options.prefixes]       An array of localization key prefixes to use. If not specified, prefixes
     *                                            are learned from the DataModel.LOCALIZATION_PREFIXES static property.
     * @param {string} [options.prefixPath]       A localization path prefix used to prefix all field names within this
     *                                            model. This is generally not required.
     *
     * @example
     * JavaScript class definition and localization call.
     * ```js
     * class MyDataModel extends foundry.abstract.DataModel {
     *   static defineSchema() {
     *     return {
     *       foo: new foundry.data.fields.StringField(),
     *       bar: new foundry.data.fields.NumberField()
     *     };
     *   }
     *   static LOCALIZATION_PREFIXES = ["MYMODULE.MYDATAMODEL"];
     * }
     *
     * Hooks.on("i18nInit", () => {
     *   Localization.localizeDataModel(MyDataModel);
     * });
     * ```
     *
     * JSON localization file
     * ```json
     * {
     *   "MYMODULE": {
     *     "MYDATAMODEL": {
     *       "FIELDS" : {
     *         "foo": {
     *           "label": "Foo",
     *           "hint": "Instructions for foo"
     *         },
     *         "bar": {
     *           "label": "Bar",
     *           "hint": "Instructions for bar"
     *         }
     *       }
     *     }
     *   }
     * }
     * ```
     */
    static localizeDataModel(
        model: AbstractConstructorOf<DataModel>,
        options?: { prefixes?: string[]; prefixPath?: string },
    ): void;

    /**
   * Localize the "label" and "hint" properties for all fields in a data schema.

   */
    static localizeSchema(
        schema: SchemaField,
        prefixes?: string[],
        options?: { prefixPath?: string; seenFields?: Set<DataField> },
    ): void;

    /**
     * Set a language as the active translation source for the session
     * @param lang A language string in CONFIG.supportedLanguages
     * @returns A Promise which resolves once the translations for the requested language are ready
     */
    setLanguage(lang: string): Promise<void>;

    /* -------------------------------------------- */
    /*  Localization API                            */
    /* -------------------------------------------- */

    /**
     * Return whether a certain string has a known translation defined.
     * @param stringId The string key being translated
     * @param fallback Allow fallback translations to count?
     */
    has(stringId: string, fallback?: boolean): boolean;

    /**
     * Localize a string by drawing a translation from the available translations dictionary, if available
     * If a translation is not available, the original string is returned
     * @param stringId  The string ID to translate
     * @return          The translated string
     */
    localize(stringId: string): string;

    /**
     * Localize a string including variable formatting for input arguments.
     * Provide a string ID which defines the localized template.
     * Variables can be included in the template enclosed in braces and will be substituted using those named keys.
     *
     * @param stringId The string ID to translate
     * @param data     Provided input data
     * @return The translated and formatted string
     *
     * @example
     * const stringId = "MY_TEST_STRING"; // "Your name is {name}"
     * game.i18n.format("MY_TEST_STRING", {name: "Andrew"}); // Produces "Your name is Andrew"
     */
    format(stringId: string, data?: Record<string, Maybe<string | number | boolean>>): string;

    /**
     * Retrieve list formatter configured to the world's language setting.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat/ListFormat}
     * @param options.style The list formatter style, either "long", "short", or "narrow".
     * @param options.type The list formatter type, either "conjunction", "disjunction", or "unit".
     */
    getListFormatter(options?: { style?: Intl.ListFormatStyle; type?: Intl.ListFormatType }): Intl.ListFormat;
}

type TranslationDictionaryValue = string | { [key: string]: TranslationDictionaryValue };
