import { ItemSheetPF2e } from "@item/base/sheet/base.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunner } from "@module/migration/runner/index.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";
import { DamageType } from "@system/damage/types.ts";
import {
    BASE_DAMAGE_TYPES_TO_CATEGORIES,
    DAMAGE_TYPES,
    DAMAGE_TYPE_ICONS,
    ENERGY_DAMAGE_TYPES,
    PHYSICAL_DAMAGE_TYPES,
} from "@system/damage/values.ts";
import {
    ErrorPF2e,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    isObject,
    localizer,
    objectHasKey,
    pick,
    sluggify,
    tupleHasValue,
} from "@util";
import Tagify from "@yaireo/tagify";
import * as R from "remeda";
import { PartialSettingsData, SettingsMenuPF2e, settingsToSheetData } from "../menu.ts";
import {
    CustomDamageData,
    HOMEBREW_TRAIT_KEYS,
    HomebrewElementsSheetData,
    HomebrewKey,
    HomebrewTag,
    HomebrewTraitKey,
    HomebrewTraitSettingsKey,
    TRAIT_PROPAGATIONS,
} from "./data.ts";
import {
    ReservedTermsRecord,
    isHomebrewCustomDamage,
    isHomebrewFlagCategory,
    prepareCleanup,
    prepareReservedTerms,
} from "./helpers.ts";

import { WeaponTrait } from "@item/weapon/types.ts";
import "@yaireo/tagify/src/tagify.scss";

class HomebrewElements extends SettingsMenuPF2e {
    static override readonly namespace = "homebrew";

    /** Whether this is the first time the homebrew tags will have been injected into CONFIG and actor derived data */
    #initialRefresh = true;

    static #reservedTerms: ReservedTermsRecord | null = null;

    static get reservedTerms(): ReservedTermsRecord {
        return (this.#reservedTerms ??= prepareReservedTerms());
    }

    static override get SETTINGS(): string[] {
        return Object.keys(this.settings);
    }

    static override get defaultOptions(): FormApplicationOptions {
        return mergeObject(super.defaultOptions, { template: "systems/pf2e/templates/system/settings/homebrew.hbs" });
    }

    protected static get traitSettings(): Record<HomebrewTraitKey, PartialSettingsData> {
        return HOMEBREW_TRAIT_KEYS.reduce(
            (result, key) => {
                result[key] = {
                    name: CONFIG.PF2E.SETTINGS.homebrew[key].name,
                    hint: CONFIG.PF2E.SETTINGS.homebrew[key].hint,
                    default: [],
                    type: Object,
                };

                return result;
            },
            {} as Record<HomebrewTraitKey, PartialSettingsData>,
        );
    }

    protected static override get settings(): Record<HomebrewKey, PartialSettingsData> {
        return {
            ...this.traitSettings,
            damageTypes: {
                name: "PF2E.SETTINGS.Homebrew.DamageTypes.Name",
                default: [],
                type: Object,
                onChange: () => {
                    new DamageTypeManager().updateSettings();
                },
            },
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "button[type=reset]")?.addEventListener("click", () => {
            this.render();
        });

        // Handle all changes for traits
        for (const key of HOMEBREW_TRAIT_KEYS) {
            const reservedTerms = HomebrewElements.reservedTerms[key];
            const input = htmlQuery<HTMLInputElement>(html, `input[name="${key}"]`);
            if (!input) throw ErrorPF2e("Unexpected error preparing form");
            const localize = localizer("PF2E.SETTINGS.Homebrew");

            new Tagify(input, {
                editTags: 1,
                hooks: {
                    beforeRemoveTag: (tags): Promise<void> => {
                        if (tags.some((t) => reservedTerms.has(sluggify(t.data.value)))) {
                            return Promise.resolve();
                        }

                        const response: Promise<unknown> = (async () => {
                            const content = localize("ConfirmDelete.Message", { element: tags[0].data.value });
                            return await Dialog.confirm({
                                title: localize("ConfirmDelete.Title"),
                                content: `<p>${content}</p>`,
                            });
                        })();
                        return (async () => ((await response) ? Promise.resolve() : Promise.reject()))();
                    },
                },
                validate: (data) => !reservedTerms.has(sluggify(data.value)),
                transformTag: (data) => {
                    if (reservedTerms.has(sluggify(data.value))) {
                        ui.notifications.error(localize("ReservedTerm", { term: data.value }));
                    }
                },
            });
        }

        htmlQuery(html, "[data-action=damage-add]")?.addEventListener("click", async () => {
            this.cache.damageTypes.push({ label: "Ouch", category: null, icon: "fa-question" });
            this.render();
        });

        for (const element of htmlQueryAll(html, "[data-action=damage-delete]")) {
            element.addEventListener("click", async (event) => {
                const idx = htmlClosest(event.target, "[data-idx]")?.dataset.idx;
                if (idx) {
                    this.cache.damageTypes.splice(Number(idx), 1);
                }
                this.render();
            });
        }
    }

    override async getData(): Promise<HomebrewElementsSheetData> {
        const data = await super.getData();
        const traitSettings = settingsToSheetData(this.constructor.traitSettings, this.cache, this.prefix);
        const damageCategories = pick(CONFIG.PF2E.damageCategories, ["physical", "energy"]);
        return {
            ...data,
            traitSettings,
            damageCategories,
            customDamageTypes: (this.cache.damageTypes ?? []).map((customType) => ({
                ...customType,
                slug: sluggify(customType.label),
            })),
        };
    }

    /** Tagify sets an empty input field to "" instead of "[]", which later causes the JSON parse to throw an error */
    protected override async _onSubmit(
        event: Event,
        options?: OnSubmitFormOptions,
    ): Promise<Record<string, unknown> | false> {
        event.preventDefault(); // Prevent page refresh if it returns early

        for (const input of htmlQueryAll<HTMLInputElement>(this.form, "tags ~ input")) {
            if (input.value === "") {
                input.value = "[]";
            }
            if (!("__tagify" in input) || !(input.__tagify instanceof Tagify)) {
                continue;
            }
        }

        return super._onSubmit(event, options);
    }

    protected override _getSubmitData(updateData?: Record<string, unknown> | undefined): Record<string, unknown> {
        const original = super._getSubmitData(updateData);
        const data: Partial<HomebrewSubmitData> = expandObject<Record<string, unknown>>(original);

        // Sanitize damage types data, including ensuring they are valid font awesome icons
        if ("damageTypes" in data && !!data.damageTypes && typeof data.damageTypes === "object") {
            data.damageTypes = Object.values(data.damageTypes);
            for (const type of data.damageTypes) {
                type.category ||= null;
                const sanitized = sluggify(type.icon ?? "");
                type.icon = sanitized.startsWith("fa-") ? sanitized : null;
            }
        }

        return data;
    }

    protected override async _updateObject(event: Event, data: Record<HomebrewTraitKey, HomebrewTag[]>): Promise<void> {
        for (const key of HOMEBREW_TRAIT_KEYS) {
            for (const tag of data[key]) {
                tag.id ??= sluggify(tag.value) as HomebrewTag<typeof key>["id"];
            }
        }

        if (event.type === "submit") {
            const cleanupTasks = HOMEBREW_TRAIT_KEYS.map((key) => {
                return this.#processDeletions(key, data[key]);
            }).filter((task): task is MigrationBase => !!task);

            // Close without waiting for migrations to complete
            new MigrationRunner().runMigrations(cleanupTasks);
            await super._updateObject(event, data);

            // Process updates
            this.#refreshSettings();
        } else {
            return super._updateObject(event, data);
        }
    }

    /** Prepare and run a migration for each set of tag deletions from a tag map */
    #processDeletions(listKey: HomebrewTraitKey, newTagList: HomebrewTag[]): MigrationBase | null {
        const oldTagList = game.settings.get("pf2e", `homebrew.${listKey}`);
        const newIDList = newTagList.map((tag) => tag.id);
        const deletions: string[] = oldTagList.flatMap((oldTag) => (newIDList.includes(oldTag.id) ? [] : oldTag.id));

        const coreElements: Record<string, string> =
            listKey === "baseWeapons" ? CONFIG.PF2E.baseWeaponTypes : CONFIG.PF2E[listKey];
        for (const id of deletions) {
            delete coreElements[id];
            if (objectHasKey(TRAIT_PROPAGATIONS, listKey)) {
                for (const recordKey of TRAIT_PROPAGATIONS[listKey]) {
                    const secondaryRecord: Record<string, string> = CONFIG.PF2E[recordKey];
                    delete secondaryRecord[id];
                }
            }
        }

        return game.user.isGM && deletions.length > 0 ? prepareCleanup(listKey, deletions) : null;
    }

    onInit(): void {
        this.#refreshSettings();
        this.#registerModuleTags();
        new DamageTypeManager().updateSettings();
    }

    /** Assigns all homebrew data stored in the world's settings to their relevant locations */
    #refreshSettings(): void {
        const reservedTerms = HomebrewElements.reservedTerms;

        // Add custom traits from settings
        for (const listKey of HOMEBREW_TRAIT_KEYS) {
            const settingsKey: HomebrewTraitSettingsKey = `homebrew.${listKey}` as const;
            const elements = game.settings.get("pf2e", settingsKey);
            const validElements = elements.filter((e) => !reservedTerms[listKey].has(e.id));
            this.#updateConfigRecords(validElements, listKey);
        }

        // Refresh any open sheets to show the new settings
        if (this.#initialRefresh) {
            this.#initialRefresh = false;
        } else {
            const sheets = Object.values(ui.windows).filter(
                (app): app is DocumentSheet => app instanceof ActorSheet || app instanceof ItemSheetPF2e,
            );
            for (const sheet of sheets) {
                sheet.render(false);
            }
        }
    }

    /** Register homebrew elements stored in a prescribed location in module flags */
    #registerModuleTags(): void {
        const activeModules = [...game.modules.entries()].filter(([_key, foundryModule]) => foundryModule.active);

        for (const [key, foundryModule] of activeModules) {
            const homebrew = foundryModule.flags?.[key]?.["pf2e-homebrew"];
            if (!R.isObject(homebrew)) continue;

            for (const recordKey of Object.keys(homebrew)) {
                if (recordKey === "damageTypes") continue; // handled elsewhere

                if (tupleHasValue(HOMEBREW_TRAIT_KEYS, recordKey)) {
                    const elements = homebrew[recordKey];
                    if (!isObject(elements) || !isHomebrewFlagCategory(elements)) {
                        console.warn(ErrorPF2e(`Homebrew record ${recordKey} is malformed in module ${key}`).message);
                        continue;
                    }

                    const elementEntries = Object.entries(elements);

                    // A registered tag can be a string label or an object containing a label and description
                    const tags = elementEntries.map(([id, value]) => ({
                        id,
                        value: typeof value === "string" ? value : value.label,
                    })) as HomebrewTag[];
                    this.#updateConfigRecords(tags, recordKey);

                    // Register descriptions if present
                    for (const [key, value] of elementEntries) {
                        if (typeof value === "object") {
                            const hbKey = key as keyof typeof CONFIG.PF2E.traitsDescriptions;
                            CONFIG.PF2E.traitsDescriptions[hbKey] = value.description;
                        }
                    }
                } else {
                    console.warn(ErrorPF2e(`Invalid homebrew record "${recordKey}" in module ${key}`).message);
                    continue;
                }
            }
        }
    }

    #getConfigRecord(recordKey: HomebrewTraitKey): Record<string, string> {
        return recordKey === "baseWeapons" ? CONFIG.PF2E.baseWeaponTypes : CONFIG.PF2E[recordKey];
    }

    #updateConfigRecords(elements: HomebrewTag[], listKey: HomebrewTraitKey): void {
        // The base-weapons map only exists in the localization file
        const coreElements: Record<string, string> = this.#getConfigRecord(listKey);
        for (const element of elements) {
            coreElements[element.id] = element.value;
            if (objectHasKey(TRAIT_PROPAGATIONS, listKey)) {
                for (const recordKey of TRAIT_PROPAGATIONS[listKey]) {
                    const record: Record<string, string> = CONFIG.PF2E[recordKey];
                    record[element.id] = element.value;
                }
            }
        }
    }
}

/**
 * To update all custom damage types in the system, we need to ensure that all collections are added to and cleaned.
 * This reduces the scope of all damage related operations so that its easier to identify when something goes wrong.
 */
class DamageTypeManager {
    // All collections that homebrew damage must be updated in
    collections = {
        physical: PHYSICAL_DAMAGE_TYPES as unknown as string[],
        energy: ENERGY_DAMAGE_TYPES as unknown as string[],
        DAMAGE_TYPES,
        BASE_DAMAGE_TYPES_TO_CATEGORIES,
        DAMAGE_TYPE_ICONS,
        damageTypesLocalization: CONFIG.PF2E.damageTypes,
        damageRollFlavorsLocalization: CONFIG.PF2E.damageRollFlavors,
        immunityTypes: immunityTypes as Record<string, string>,
        weaknessTypes: weaknessTypes as Record<string, string>,
        resistanceTypes: resistanceTypes as Record<string, string>,
    };

    addCustomDamage(data: CustomDamageData, options: { slug?: string } = {}): void {
        const collections = this.collections;
        const slug = (options.slug ?? sluggify(data.label)) as DamageType;
        collections.DAMAGE_TYPES.add(slug);
        if (tupleHasValue(["physical", "energy"], data.category)) {
            collections[data.category].push(slug);
        }
        collections.BASE_DAMAGE_TYPES_TO_CATEGORIES[slug] = data.category ?? null;
        collections.DAMAGE_TYPE_ICONS[slug] = data.icon?.substring(3) ?? null; // icons registered do not include the fa-
        collections.damageTypesLocalization[slug] = data.label;

        const versatileLabel = game.i18n.format("PF2E.TraitVersatileX", { x: data.label });
        CONFIG.PF2E.weaponTraits[`versatile-${slug}` as WeaponTrait] = versatileLabel;
        CONFIG.PF2E.npcAttackTraits[`versatile-${slug}` as WeaponTrait] = versatileLabel;

        const damageFlavor = data.label.toLocaleLowerCase(game.i18n.lang);
        collections.damageRollFlavorsLocalization[slug] = damageFlavor;
        collections.immunityTypes[slug] = damageFlavor;
        collections.weaknessTypes[slug] = damageFlavor;
        collections.resistanceTypes[slug] = damageFlavor;
    }

    updateSettings() {
        const reservedTerms = HomebrewElements.reservedTerms;

        // Delete all existing homebrew damage types first
        const typesToDelete: Set<string> = DAMAGE_TYPES.filter((t) => !reservedTerms.damageTypes.has(t));
        for (const collection of Object.values(this.collections)) {
            if (collection instanceof Set) {
                const types = [...collection].filter((t) => typesToDelete.has(t));
                for (const damageType of types) collection.delete(damageType);
            } else {
                const types = Object.keys(collection).filter((t): t is keyof typeof collection => typesToDelete.has(t));
                for (const damageType of types) delete collection[damageType];
            }
        }

        // Delete versatile damage traits
        for (const type of typesToDelete) {
            const weaponTraits: Record<string, string> = CONFIG.PF2E.weaponTraits;
            const npcAttackTraits: Record<string, string> = CONFIG.PF2E.npcAttackTraits;
            delete weaponTraits[`versatile-${type}`];
            delete npcAttackTraits[`versatile-${type}`];
        }

        // Read module damage types
        const activeModules = [...game.modules.entries()].filter(([_key, foundryModule]) => foundryModule.active);
        for (const [key, foundryModule] of activeModules) {
            const homebrew = foundryModule.flags?.[key]?.["pf2e-homebrew"];
            if (!R.isObject(homebrew) || !homebrew.damageTypes) continue;

            const elements = homebrew.damageTypes;
            if (!isObject(elements) || !isHomebrewCustomDamage(elements)) {
                console.warn(ErrorPF2e(`Homebrew record damageTypes is malformed in module ${key}`).message);
                continue;
            }

            for (const [slug, data] of Object.entries(elements)) {
                if (!reservedTerms.damageTypes.has(slug)) {
                    this.addCustomDamage(data, { slug });
                } else {
                    console.warn(
                        ErrorPF2e(
                            `Homebrew damage type "${slug}" from module ${foundryModule.title} is a reserved term.`,
                        ).message,
                    );
                    continue;
                }
            }
        }

        // Read setting damage types
        const customTypes = game.settings
            .get("pf2e", "homebrew.damageTypes")
            .filter((t) => !reservedTerms.damageTypes.has(sluggify(t.label)));
        for (const data of customTypes) {
            this.addCustomDamage(data);
        }
    }
}

type HomebrewSubmitData = {
    damageTypes: CustomDamageData[];
} & Record<string, unknown>;

interface HomebrewElements extends SettingsMenuPF2e {
    constructor: typeof HomebrewElements;
    cache: HomebrewSubmitData;
}

export { HomebrewElements };
