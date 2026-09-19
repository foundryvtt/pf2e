import type { TraitViewData } from "@actor/data/base.ts";
import type { JournalEntryPageHandlebarsSheetRenderOptions } from "@client/applications/sheets/journal/journal-entry-page-hbs-sheet.d.mts";
import type { SourceFromSchema } from "@common/data/fields.d.mts";
import type { JournalEntryPageSchema } from "@common/documents/journal-entry-page.d.mts";
import type { RuneTrait } from "@item/physical/runes.ts";
import { RARITIES, Rarity } from "@module/data.ts";
import { PublicationField } from "@module/model.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { ErrorPF2e } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import { RUNE_CATEGORIES } from "./constants.ts";
import type { RunePageSystemData, RunePageSystemSchema, RuneVariantSchema } from "./data.ts";
import type { RuneCategory } from "./types.ts";

type RuneVariantData = NonNullable<RunePageSystemData["variants"][number]>;
interface RuneVariantSheetData extends Omit<RuneVariantData, "price"> {
    level: number;
    price: string;
}
interface ViewRenderContext {
    levelHeader: string;
    rarity: TraitViewData;
    traits: TraitViewData[];
    usageText: string;
    description: string;
    variants: RuneVariantSheetData[];
    soleVariant: RuneVariantSheetData | null;
}

interface EditRenderContext {
    systemFields: RunePageSystemSchema;
    variantFields: RuneVariantSchema;
    publicationFields: PublicationField["fields"];
    categories: { value: RuneCategory; label: string }[];
    rarities: { value: Rarity; label: string }[];
    traits: { value: RuneTrait; label: string }[];
    variants: Record<string, fa.ApplicationTab>;
    priceUnit: string;
    publicationLicenses: { value: "OGL" | "ORC"; label: string }[];
    actionTooltips: Record<string, string>;
}

type RunePageRenderContext = fa.api.DocumentSheetRenderContext & (ViewRenderContext | EditRenderContext);

class RunePageSheet extends fa.sheets.journal.JournalEntryPageHandlebarsSheet {
    static override DEFAULT_OPTIONS: DeepPartial<fa.sheets.journal.JournalPageSheetConfiguration> = {
        form: { submitOnChange: false },
        actions: {
            addVariant: RunePageSheet.#onClickAddVariant,
            deleteVariant: RunePageSheet.#onClickDeleteVariant,
        },
    };

    static override TABS: Record<string, fa.ApplicationTabsConfiguration> = {
        variants: { tabs: [] },
    };

    static override VIEW_PARTS = {
        sheet: {
            template: `systems/${SYSTEM_ID}/templates/journal-entry-page/rune/view.hbs`,
            root: true,
        },
    };

    static override EDIT_PARTS = {
        header: super.EDIT_PARTS.header,
        body: {
            template: `systems/${SYSTEM_ID}/templates/journal-entry-page/rune/edit.hbs`,
            templates: ["templates/generic/tab-navigation.hbs"],
            scrollable: [""],
        },
        footer: super.EDIT_PARTS.footer,
    };

    private static get RUNE_TRAITS(): { value: RuneTrait; label: string }[] {
        return (RunePageSheet.#RUNE_TRAITS ??= fu
            .iterateEntries(CONFIG.PF2E.runeTraits)
            .map(([value, label]) => ({ value, label: _loc(label) }))
            .toArray());
    }

    static #RUNE_TRAITS: { value: RuneTrait; label: string }[] | null = null;

    protected override _initializeApplicationOptions(
        options: DeepPartial<fa.sheets.journal.JournalPageSheetConfiguration>,
    ): fa.sheets.journal.JournalPageSheetConfiguration {
        const initialized = super._initializeApplicationOptions(options);
        if (initialized.mode === "view") initialized.viewClasses.push("view");
        else initialized.classes.push("rune", initialized.mode);
        return initialized;
    }

    protected override async _prepareContext(
        options: JournalEntryPageHandlebarsSheetRenderOptions,
    ): Promise<RunePageRenderContext> {
        const context = (await super._prepareContext(options)) as fa.api.DocumentSheetRenderContext;
        const runeContext = await (this.isView ? this.#prepareViewContext() : this.#prepareEditContext());
        return Object.assign(context, runeContext);
    }

    async #prepareViewContext(): Promise<ViewRenderContext> {
        const page = this.document;
        const variants: RuneVariantSheetData[] = fu
            .iterateEntries(page.system.variants)
            .map(([level, variant]) => {
                if (!variant) throw ErrorPF2e("Unexpected missing data");
                return { ...variant, level: Number(level), price: variant.price.toString({ comma: true }) };
            })
            .toArray()
            .sort((a, b) => a.level - b.level);
        const soleVariant = variants.length === 1 ? variants[0] : null;
        const levelHeader = soleVariant ? String(soleVariant.level) : `${Math.min(...variants.map((v) => v.level))}+`;
        const traits = Array.from(page.system.traits.value)
            .map((t) => traitSlugToObject(t, CONFIG.PF2E.effectTraits))
            .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
        const description = await TextEditorPF2e.enrichHTML(page.text.content ?? "");
        return {
            levelHeader,
            rarity: traitSlugToObject(page.system.traits.rarity, CONFIG.PF2E.rarityTraits),
            traits,
            usageText: page.system.usage.text,
            description,
            variants,
            soleVariant,
        };
    }

    async #prepareEditContext(): Promise<EditRenderContext> {
        const systemFields = this.document.system.schema.fields;
        const categories = RUNE_CATEGORIES.map((category) => ({
            value: category,
            label: _loc(`PF2E.JournalEntryPage.Rune.CATEGORIES.${category}`),
        }));
        const priceUnit = _loc(`PF2E.CurrencyAbbreviations.${SYSTEM_ID === "pf2e" ? "gp" : "credits"}`);
        return {
            systemFields,
            variantFields: systemFields.variants.element.fields,
            publicationFields: systemFields.publication.fields,
            categories,
            rarities: RARITIES.map((value) => ({ value, label: _loc(CONFIG.PF2E.rarityTraits[value]) })),
            traits: RunePageSheet.RUNE_TRAITS,
            variants: this._prepareTabs("variants"),
            priceUnit,
            publicationLicenses: (["ORC", "OGL"] as const).map((value) => ({
                value,
                label: _loc(`PF2E.Publication.License.${value}`),
            })),
            actionTooltips: {
                addVariant: _loc("PF2E.JournalEntryPage.Rune.ACTIONS.addVariant"),
                deleteVariant: _loc("PF2E.JournalEntryPage.Rune.ACTIONS.deleteVariant"),
            },
        };
    }

    protected override _getTabsConfig(group: string): fa.ApplicationTabsConfiguration | null {
        if (this.isView || group !== "variants") return super._getTabsConfig(group);
        const tabs = fu
            .iterateEntries(this.document.system.variants)
            .map(([level, data]) => {
                if (!data) throw new Error("Unexpected missing rune variant data");
                const price = SYSTEM_ID === "pf2e" ? data.price.goldValue : Math.floor(data.price.copperValue / 10);
                return {
                    id: `level${level}`,
                    label: _loc(`PF2E.LevelN`, { level }),
                    ...data,
                    level: Number(level),
                    price,
                };
            })
            .toArray()
            .sort((a, b) => a.level - b.level);
        return { tabs, initial: tabs[0].id };
    }

    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ): Record<string, unknown> {
        const submitData = super._processFormData(event, form, formData);
        if (!R.isPlainObject(submitData.system) || !R.isPlainObject(submitData.system.variants)) {
            throw ErrorPF2e("Missing variants in form data");
        }

        // Configure a forced replacement of variants
        const newVariants: Record<number, Record<string, unknown>> = {};
        // why mr hejlsberg do this https://github.com/microsoft/TypeScript/pull/33622
        const variantField: RunePageSystemSchema["variants"]["element"] =
            this.document.system.schema.fields.variants.element;
        for (const variant of fu.iterateValues(submitData.system.variants)) {
            if (!R.isPlainObject(variant)) throw ErrorPF2e("Non-object variant data encountered");
            variant.name ||= null;
            variantField.validate(variant, { strict: true });
            variant.price = SYSTEM_ID === "pf2e" ? variant.price * 100 : variant.price * 10;
            if (!("level" in variant) || typeof variant.level !== "number") {
                throw ErrorPF2e("Missing level for variant");
            }
            const level = Math.floor(Math.clamp(variant.level, 2, 99));
            delete variant.level;
            newVariants[level] = variant;
        }
        submitData.system.variants = _replace(newVariants);

        return submitData;
    }

    /** Ensure the same tab remains visible if the level corresponding with it is changed. */
    protected override async _processSubmitData(
        event: SubmitEvent,
        form: HTMLFormElement,
        submitData: Record<string, unknown>,
        options?: Partial<foundry.abstract.DatabaseCreateOperation<fd.JournalEntry | null>>,
    ): Promise<void> {
        if (!R.isPlainObject(submitData.system) || !R.isObjectType(submitData.system.variants)) {
            throw ErrorPF2e("Missing variants in form data");
        }
        const levelInput = this.element.querySelector<HTMLInputElement>(".variant.tab.active input[data-level]");
        const newLevel = levelInput?.value ?? "";
        const page = this.document;
        this.tabGroups.variants =
            newLevel in submitData.system.variants ? `level${newLevel}` : `level${page.system.lowestLevel}`;
        return super._processSubmitData(event, form, submitData, options);
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    static async #onClickAddVariant(this: RunePageSheet, _event: PointerEvent, button: HTMLElement): Promise<void> {
        button.setAttribute("disabled", "");
        const variants = this.document._source.system.variants;
        const levels = Object.keys(variants).map(Number);
        const newLevel = Math.max(...levels) + 1;
        const updated = !!(await this.document.update({ [`system.variants.${newLevel}`]: {} }));
        if (!updated) this.render({ parts: ["body"] });
    }

    static async #onClickDeleteVariant(this: RunePageSheet, _event: PointerEvent, button: HTMLElement): Promise<void> {
        button.setAttribute("disabled", "");
        const variants = fu.deepClone(this.document._source.system.variants);
        const level = Number(button.closest<HTMLElement>("[data-level]")?.dataset.level ?? "");
        delete variants[level];
        const updated = !!(await this.document.update({ "system.variants": _replace(variants) }));
        if (!updated) this.render({ parts: ["body"] });
    }
}

interface RunePageSheet extends fa.sheets.journal.JournalEntryPageHandlebarsSheet {
    get document(): RunePage;
}

interface RunePage extends JournalEntryPage {
    type: "rune";
    system: RunePageSystemData<this>;
    _source: SourceFromSchema<JournalEntryPageSchema<"rune", SourceFromSchema<RunePageSystemSchema>>>;
}

export { RunePageSheet };
