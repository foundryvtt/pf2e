import type { Language, SenseAcuity } from "@actor/creature/types.ts";
import { SENSES_WITH_MANDATORY_ACUITIES, SENSES_WITH_UNLIMITED_RANGE } from "@actor/creature/values.ts";
import {
    activateActionSheetListeners,
    createSelfEffectSheetData,
    handleSelfEffectDrop,
} from "@item/ability/helpers.ts";
import { SelfEffectReference } from "@item/ability/index.ts";
import { ARMOR_CATEGORIES } from "@item/armor/values.ts";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import type { FeatPF2e } from "@item/feat/document.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { OneToFour } from "@module/data.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import {
    ErrorPF2e,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    localizer,
    objectHasKey,
    sluggify,
    tagify,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import { featCanHaveKeyOptions } from "./helpers.ts";

class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dropSelector: ".tab[data-tab=details]" }],
            hasSidebar: true,
        };
    }

    override get validTraits(): Record<string, string> {
        return CONFIG.PF2E.featTraits;
    }

    override async getData(options?: Partial<ItemSheetOptions>): Promise<FeatSheetData> {
        const sheetData = await super.getData(options);
        const feat = this.item;
        const hasLineageTrait = feat.system.traits.value.includes("lineage");
        const subfeatures = feat.system.subfeatures;
        const showPrerequisites =
            feat.system.prerequisites.value.length > 0 &&
            !["ancestryfeature", "curse", "deityboon"].includes(feat.category);

        return {
            ...sheetData,
            itemType: game.i18n.localize(feat.isFeature ? "PF2E.LevelLabel" : "PF2E.Item.Feat.LevelLabel"),
            actionsNumber: CONFIG.PF2E.actionsNumber,
            actionTypes: CONFIG.PF2E.actionTypes,
            acuityOptions: CONFIG.PF2E.senseAcuities,
            attributes: CONFIG.PF2E.abilities,
            canHaveKeyOptions: featCanHaveKeyOptions(feat),
            categories: CONFIG.PF2E.featCategories,
            frequencies: CONFIG.PF2E.frequencies,
            hasLanguages: subfeatures.languages.slots > 0 || subfeatures.languages.granted.length > 0,
            hasLineageTrait,
            hasProficiencies: Object.keys(subfeatures.proficiencies).length > 0,
            hasSenses: Object.keys(subfeatures.senses).length > 0,
            mandatoryTakeOnce: hasLineageTrait || sheetData.data.onlyLevel1,
            maxTakableOptions: [
                { value: "1", label: "No" },
                { value: "2", label: "PF2E.Item.Feat.TakeMultiple.Two" },
                { value: "3", label: "PF2E.Item.Feat.TakeMultiple.Three" },
                { value: "4", label: "PF2E.Item.Feat.TakeMultiple.Four" },
                { value: "5", label: "PF2E.Item.Feat.TakeMultiple.Five" },
                { value: "Infinity", label: "PF2E.Item.Feat.TakeMultiple.NoLimit" },
            ],
            languages: this.#getLanguageOptions(),
            proficiencies: this.#getProficiencyOptions(),
            proficiencyRankOptions: Object.fromEntries(
                Object.values(CONFIG.PF2E.proficiencyRanks).map((label, i) => [`${i}`, label]),
            ),
            selfEffect: createSelfEffectSheetData(sheetData.data.selfEffect),
            senses: this.#getSenseOptions(),
            showPrerequisites,
        };
    }

    #getLanguageOptions(): LanguageOptions {
        const subfeatures = this.item.system.subfeatures;
        const languages = R.keys
            .strict(CONFIG.PF2E.languages)
            .map((slug) => ({ slug, label: game.i18n.localize(CONFIG.PF2E.languages[slug]) }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return {
            slots: subfeatures.languages.slots,
            granted: {
                available: languages.filter((l) => !subfeatures.languages.granted.includes(l.slug)),
                selected: languages.filter((l) => subfeatures.languages.granted.includes(l.slug)),
            },
        };
    }

    #getProficiencyOptions(): ProficiencyOptions {
        const feat = this.item;
        const localize = localizer("PF2E.Actor.Character");
        const selectedIncreases = feat.system.subfeatures.proficiencies;

        return {
            other: {
                group: null,
                options: [
                    {
                        slug: "perception",
                        label: game.i18n.localize("PF2E.PerceptionLabel"),
                        rank: selectedIncreases.perception?.rank ?? null,
                    },
                    {
                        slug: "spellcasting",
                        label: game.i18n.localize("PF2E.Actor.Creature.Spellcasting.ShortLabel"),
                        rank: selectedIncreases.spellcasting?.rank ?? null,
                    },
                ].sort((a, b) => a.label.localeCompare(b.label)),
            },
            saves: {
                group: localize("Proficiency.SavingThrow.Title"),
                options: R.toPairs
                    .strict(CONFIG.PF2E.saves)
                    .map(([slug, label]) => ({
                        slug,
                        label: game.i18n.localize(label),
                        rank: selectedIncreases[slug]?.rank ?? null,
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label)),
            },
            attacks: {
                group: localize("Proficiency.Attack.Title"),
                options: R.toPairs
                    .strict(CONFIG.PF2E.weaponCategories)
                    .map(([slug, categoryLabel]) => {
                        const label = tupleHasValue(WEAPON_CATEGORIES, slug)
                            ? localize(`Proficiency.Attack.${sluggify(slug, { camel: "bactrian" })}`)
                            : game.i18n.localize(categoryLabel);
                        return {
                            slug,
                            label,
                            rank: selectedIncreases[slug]?.rank ?? null,
                        };
                    })
                    .sort((a, b) => a.label.localeCompare(b.label)),
            },
            defenses: {
                group: localize("Proficiency.Defense.Title"),
                options: R.toPairs
                    .strict(CONFIG.PF2E.armorCategories)
                    .map(([slug, categoryLabel]) => {
                        const label = tupleHasValue(ARMOR_CATEGORIES, slug)
                            ? localize(`Proficiency.Defense.${sluggify(slug, { camel: "bactrian" })}`)
                            : game.i18n.localize(categoryLabel);
                        return {
                            slug,
                            label,
                            rank: selectedIncreases[slug]?.rank ?? null,
                        };
                    })
                    .sort((a, b) => a.label.localeCompare(b.label)),
            },
            classes: {
                group: localize("ClassDC.Plural"),
                options: R.toPairs
                    .strict(CONFIG.PF2E.classTraits)
                    .map(([slug, label]) => ({
                        slug,
                        label: game.i18n.localize(label),
                        attribute: selectedIncreases[slug]?.attribute ?? null,
                        rank: selectedIncreases[slug]?.rank ?? null,
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label)),
            },
        };
    }

    #getSenseOptions(): SenseOption[] {
        const feat = this.item;
        const selections = feat.system.subfeatures.senses;
        const senses = R.keys.strict(CONFIG.PF2E.senses);
        const sensesWithUnlimitedRange: readonly string[] = SENSES_WITH_UNLIMITED_RANGE;
        return senses
            .map((slug) => {
                const selection = selections[slug];
                return {
                    slug,
                    label: game.i18n.localize(CONFIG.PF2E.senses[slug]),
                    acuity: SENSES_WITH_MANDATORY_ACUITIES[slug] ?? selection?.acuity ?? "precise",
                    range: sensesWithUnlimitedRange.includes(slug) ? null : selection?.range ?? null,
                    special: slug === "darkvision" ? selection?.special ?? null : null,
                    canSetAcuity: !(slug in SENSES_WITH_MANDATORY_ACUITIES),
                    canSetRange: !sensesWithUnlimitedRange.includes(slug),
                    selected: !!selection,
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];
        const feat = this.item;
        activateActionSheetListeners(feat, html);

        const getInput = (name: string): HTMLTagifyTagsElement | null =>
            htmlQuery<HTMLTagifyTagsElement>(html, `tagify-tags[name="${name}"]`);

        tagify(getInput("system.prerequisites.value"), { maxTags: 6, delimiters: ";" });
        tagify(getInput("system.subfeatures.keyOptions"), { whitelist: CONFIG.PF2E.abilities, maxTags: 3 });

        // Disable the "add subfeature" anchor unless a corresponding option is selected
        const unselectedOptionsSelects = htmlQueryAll<HTMLSelectElement>(html, "select[data-unselected-options]");
        for (const unselectedOptionsSelect of unselectedOptionsSelects) {
            unselectedOptionsSelect.addEventListener("change", (event) => {
                event.stopPropagation();
                const addOptionAnchor = htmlQuery(htmlClosest(unselectedOptionsSelect, "li"), "a[data-action]");
                addOptionAnchor?.toggleAttribute("disabled", !unselectedOptionsSelect.value);
            });
        }

        this.#activateLanguagesListeners(html);
        this.#activateProficienciesListeners(html);
        this.#activateSensesListeners(html);
    }

    #activateLanguagesListeners(html: HTMLElement): void {
        const feat = this.item;
        const formGroup = htmlQuery(html, ".form-group[data-languages]");
        const newLanguageSelect = htmlQuery<HTMLSelectElement>(formGroup, "select[data-unselected-options]");
        formGroup?.addEventListener("click", (event) => {
            const anchor = htmlClosest(event.target, "a[data-action]");
            if (!anchor) return;

            const currentGranted = feat._source.system.subfeatures?.languages?.granted ?? [];
            if (anchor.dataset.action === "add-language") {
                const slug = newLanguageSelect?.value;
                if (!slug) throw ErrorPF2e("No option selected");

                if (slug === "slots") {
                    feat.update({ "system.subfeatures.languages.slots": 1 });
                } else if (objectHasKey(CONFIG.PF2E.languages, slug)) {
                    const options = this.#getLanguageOptions().granted.available;
                    if (options.some((o) => o.slug === slug)) {
                        feat.update({ [`system.subfeatures.languages.granted`]: R.unique([...currentGranted, slug]) });
                    }
                }
            } else if (anchor.dataset.action === "delete-language") {
                const slug = anchor.dataset.slug ?? "";
                feat.update({ "system.subfeatures.languages.granted": currentGranted.filter((l) => l !== slug) });
            } else if (anchor.dataset.action === "delete-slots") {
                feat.update({ "system.subfeatures.languages.-=slots": null });
            }
        });
    }

    #activateProficienciesListeners(html: HTMLElement): void {
        const feat = this.item;
        const formGroup = htmlQuery(html, ".form-group[data-proficiencies]");
        const newProficiencySelect = htmlQuery<HTMLSelectElement>(formGroup, "select[data-unselected-options]");
        formGroup?.addEventListener("click", (event) => {
            const anchor = htmlClosest(event.target, "a[data-action]");
            if (!anchor) return;
            if (anchor.dataset.action === "add-proficiency") {
                const slug = newProficiencySelect?.value;
                if (!slug) throw ErrorPF2e("No option selected");

                const options = Object.values(this.#getProficiencyOptions())
                    .map((o) => o.options)
                    .flat(2)
                    .filter((o) => !o.rank)
                    .map((o) => o.slug);
                if (options.includes(slug)) {
                    const data = slug in CONFIG.PF2E.classTraits ? { rank: 1, attribute: null } : { rank: 1 };
                    feat.update({ [`system.subfeatures.proficiencies.${slug}`]: data });
                }
            } else if (anchor.dataset.action === "delete-proficiency") {
                const slug = anchor.dataset.slug ?? "";
                if (slug in feat.system.subfeatures.proficiencies) {
                    feat.update({ [`system.subfeatures.proficiencies.-=${slug}`]: null });
                }
            }
        });
    }

    #activateSensesListeners(html: HTMLElement): void {
        const feat = this.item;
        const formGroup = htmlQuery(html, ".form-group[data-senses]");
        const newSenseSelect = htmlQuery<HTMLSelectElement>(formGroup, "select[data-unselected-options]");

        formGroup?.addEventListener("click", (event) => {
            const anchor = htmlClosest(event.target, "a[data-action]");

            switch (anchor?.dataset.action) {
                case "add-sense": {
                    const slug = newSenseSelect?.value;
                    if (!slug) throw ErrorPF2e("No option selected");

                    const options = this.#getSenseOptions()
                        .filter((o) => !o.selected)
                        .map((o) => o.slug);
                    if (options.includes(slug)) {
                        const [acuity, range] = ["low-light-vision", "darkvision", "greater-darkvision"].includes(slug)
                            ? [undefined, undefined]
                            : ["imprecise", 30];
                        feat.update({ [`system.subfeatures.senses.${slug}`]: { acuity, range } });
                    }
                    break;
                }
                case "delete-sense": {
                    const slug = anchor.dataset.slug ?? "";
                    if (slug in feat.system.subfeatures.senses) {
                        feat.update({ [`system.subfeatures.senses.-=${slug}`]: null });
                    }
                    break;
                }
                case "toggle-darkvision-special": {
                    const darkvision = feat.system.subfeatures.senses.darkvision;
                    const special = anchor.dataset.special;
                    if (!darkvision || !tupleHasValue(["ancestry", "llv", "second"], special)) {
                        throw ErrorPF2e("Unexpected failure toggling darkvision special clause");
                    }
                    const newSpecial = {
                        ancestry:
                            special === "ancestry" ? !darkvision.special?.ancestry : !!darkvision.special?.ancestry,
                        llv: special === "llv" ? !darkvision.special?.llv : !!darkvision.special?.llv,
                        second: special === "second" ? !darkvision.special?.second : !!darkvision.special?.second,
                    };
                    // Ensure that only one of `ancestry` and `llv` are true
                    if (special === "ancestry" && newSpecial.ancestry && newSpecial.llv) {
                        newSpecial.llv = false;
                    } else if (special === "llv" && newSpecial.llv && newSpecial.ancestry) {
                        newSpecial.ancestry = false;
                    }

                    feat.update({ [`system.subfeatures.senses.darkvision.special`]: newSpecial });
                }
            }
        });
    }

    override async _onDrop(event: DragEvent): Promise<void> {
        return handleSelfEffectDrop(this, event);
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // This will be here until we migrate feat prerequisites to be a list of strings
        if (Array.isArray(formData["system.prerequisites.value"])) {
            formData["system.prerequisites.value"] = formData["system.prerequisites.value"].map((value) => ({ value }));
        }

        // Keep feat data tidy
        const keyOptionsKey = "system.subfeatures.keyOptions";
        const hasEmptyKeyOptions = Array.isArray(formData[keyOptionsKey]) && formData[keyOptionsKey].length === 0;
        const hasNoKeyOptions = !(keyOptionsKey in formData);
        if (hasEmptyKeyOptions || hasNoKeyOptions) {
            delete formData[keyOptionsKey];
            if (this.item._source.system.subfeatures?.keyOptions) {
                formData["system.subfeatures.-=keyOptions"] = null;
            }
        }

        const languageSlotsKey = "system.subfeatures.languages.slots";
        if (languageSlotsKey in formData && !(Number(formData[languageSlotsKey]) > 0)) {
            delete formData[languageSlotsKey];
            formData["system.subfeatures.languages.-=slots"] = null;
        }

        const pattern = /^system\.subfeatures\.proficiencies\.([a-z]+)\.to$/;
        const proficiencies = Object.keys(formData).filter((k) => pattern.test(k));
        for (const path of proficiencies) {
            const slug = pattern.exec(path)?.at(1);
            if (slug && slug in CONFIG.PF2E.classTraits && formData[path] !== 1) {
                delete formData[`system.subfeatures.proficiencies.${slug}.attribute`];
                formData[`system.subfeatures.proficiencies.${slug}.-=attribute`] = null;
            }
        }

        return super._updateObject(event, formData);
    }
}

interface FeatSheetData extends ItemSheetDataPF2e<FeatPF2e> {
    actionsNumber: typeof CONFIG.PF2E.actionsNumber;
    actionTypes: typeof CONFIG.PF2E.actionTypes;
    acuityOptions: typeof CONFIG.PF2E.senseAcuities;
    attributes: typeof CONFIG.PF2E.abilities;
    canHaveKeyOptions: boolean;
    categories: typeof CONFIG.PF2E.featCategories;
    frequencies: typeof CONFIG.PF2E.frequencies;
    hasLanguages: boolean;
    hasLineageTrait: boolean;
    hasProficiencies: boolean;
    hasSenses: boolean;
    languages: LanguageOptions;
    mandatoryTakeOnce: boolean;
    maxTakableOptions: FormSelectOption[];
    proficiencies: ProficiencyOptions;
    proficiencyRankOptions: Record<string, string>;
    selfEffect: SelfEffectReference | null;
    senses: SenseOption[];
    showPrerequisites: boolean;
}

interface LanguageOptions {
    slots: number;
    granted: {
        available: { slug: Language; label: string }[];
        selected: { slug: Language; label: string }[];
    };
}

interface ProficiencyOptions {
    other: ProficiencyOptionGroup<null>;
    saves: ProficiencyOptionGroup;
    attacks: ProficiencyOptionGroup;
    defenses: ProficiencyOptionGroup;
    classes: ProficiencyOptionGroup;
}

interface ProficiencyOptionGroup<TGroup extends string | null = string> {
    group: TGroup;
    options: { slug: string; label: string; rank: OneToFour | null }[];
}

interface SenseOption {
    acuity?: SenseAcuity | null;
    canSetAcuity: boolean;
    canSetRange: boolean;
    label: string;
    range?: number | null;
    selected: boolean;
    slug: string;
    special: { ancestry: boolean; second: boolean } | null;
}

export { FeatSheetPF2e };
