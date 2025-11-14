import { LANGUAGES_BY_RARITY } from "@actor/creature/values.ts";
import { resetActors } from "@actor/helpers.ts";
import { ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunner } from "@module/migration/runner/index.ts";
import { LanguageSelector } from "@system/tag-selector/languages.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, localizer, objectHasKey, sluggify } from "@util";
import { DestroyableManager } from "@util/destroyables.ts";
import Tagify from "@yaireo/tagify";
import "@yaireo/tagify/dist/tagify.css";
import * as R from "remeda";
import { PartialSettingsData, SettingsMenuPF2e } from "../menu.ts";
import { DamageTypeManager } from "./damage.ts";
import {
    CustomDamageData,
    HOMEBREW_ELEMENT_KEYS,
    HomebrewElementsSheetData,
    HomebrewKey,
    HomebrewTag,
    HomebrewTraitKey,
    HomebrewTraitSettingsKey,
    LanguageSettings,
    ModuleHomebrewData,
    TRAIT_PROPAGATIONS,
} from "./data.ts";
import { ReservedTermsRecord, prepareCleanup, prepareReservedTerms, readModuleHomebrewSettings } from "./helpers.ts";
import { LanguagesManager } from "./languages.ts";
import appv1 = foundry.appv1;

class HomebrewElements extends SettingsMenuPF2e {
    static override readonly namespace = "homebrew";

    /** Whether this is the first time the homebrew tags will have been injected into CONFIG and actor derived data */
    #initialRefresh = true;

    declare languagesManager: LanguagesManager;

    static #reservedTerms: ReservedTermsRecord | null = null;

    static #moduleData: ModuleHomebrewData | null = null;

    static get reservedTerms(): ReservedTermsRecord {
        return (this.#reservedTerms ??= prepareReservedTerms());
    }

    static get moduleData(): ModuleHomebrewData {
        return (this.#moduleData ??= readModuleHomebrewSettings());
    }

    static override get SETTINGS(): string[] {
        return Object.keys(this.settings);
    }

    static override get defaultOptions(): appv1.api.FormApplicationOptions {
        return {
            ...super.defaultOptions,
            template: `${SYSTEM_ROOT}/templates/system/settings/homebrew.hbs`,
            width: 625,
        };
    }

    static #campaignSettings = {
        campaignFeats: {
            name: "PF2E.SETTINGS.CampaignFeats.Name",
            hint: "PF2E.SETTINGS.CampaignFeats.Hint",
            default: false,
            type: Boolean,
            tab: "campaign",
            onChange: (value) => {
                game.pf2e.settings.campaign.feats.enabled = !!value;
                resetActors(game.actors.filter((a) => a.isOfType("character")));
            },
        },
        campaignType: {
            name: "PF2E.SETTINGS.CampaignType.Name",
            hint: "PF2E.SETTINGS.CampaignType.Hint",
            default: "none",
            choices: R.mapToObj(["none", "kingmaker"], (key) => [key, `PF2E.SETTINGS.CampaignType.Choices.${key}`]),
            type: String,
            tab: "campaign",
            onChange: async (value) => {
                game.pf2e.settings.campaign.type = value === "none" ? null : String(value);
                await resetActors(game.actors.filter((a) => a.isOfType("party")));
                ui.sidebar.render();
            },
        },
    } satisfies Record<string, PartialSettingsData>;

    static get #otherSettings(): Record<HomebrewTraitKey, PartialSettingsData> {
        return HOMEBREW_ELEMENT_KEYS.reduce(
            (result, key) => {
                const sluggified = sluggify(key);
                const tab = sluggified.endsWith("traits")
                    ? "traits"
                    : sluggified.includes("languages")
                      ? "languages"
                      : "taxonomies";
                result[key] = {
                    prefix: "homebrew.",
                    tab,
                    name: `PF2E.SETTINGS.Homebrew.${key.capitalize()}.Name`,
                    hint: `PF2E.SETTINGS.Homebrew.${key.capitalize()}.Hint`,
                    default: [],
                    type: Array,
                };

                return result;
            },
            {} as Record<HomebrewTraitKey, PartialSettingsData>,
        );
    }

    protected static override get settings(): Record<HomebrewKey, PartialSettingsData> {
        return {
            ...this.#campaignSettings,
            ...this.#otherSettings,
            damageTypes: {
                prefix: "homebrew.",
                tab: "damage",
                name: "PF2E.SETTINGS.Homebrew.DamageTypes.Name",
                default: [],
                type: Array,
                onChange: () => {
                    new DamageTypeManager().updateSettings();
                },
            },
            languageRarities: {
                prefix: "homebrew.",
                tab: "languages",
                name: "PF2E.Settings.Homebrew.Languages.Rarities.Name",
                type: LanguageSettings,
                default: {
                    common: "taldane",
                    uncommon: [...LANGUAGES_BY_RARITY.uncommon],
                    rare: [...LANGUAGES_BY_RARITY.rare],
                    secret: [...LANGUAGES_BY_RARITY.secret],
                    unavailable: [],
                },
                onChange: (value) => {
                    if (value instanceof LanguageSettings) {
                        game.pf2e.settings.campaign.languages = value;
                    }
                    const languageSelector = Object.values(ui.windows).find((a) => a instanceof LanguageSelector);
                    languageSelector?.render();
                },
            },
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Handle all changes for traits
        for (const key of HOMEBREW_ELEMENT_KEYS) {
            const reservedTerms = HomebrewElements.reservedTerms[key];
            const input = htmlQuery<HTMLInputElement>(html, `input[name="${key}"]`);
            if (!input) throw ErrorPF2e("Unexpected error preparing form");
            const localize = localizer("PF2E.SETTINGS.Homebrew");

            const tagify = new Tagify(input, {
                editTags: 1,
                hooks: {
                    beforeRemoveTag: (tags): Promise<void> => {
                        if (tags.some((t) => reservedTerms.has(sluggify(t.data.value)))) {
                            return Promise.resolve();
                        }

                        const response: Promise<unknown> = (async () => {
                            const content = localize("ConfirmDelete.Message", { element: tags[0].data.value });
                            return await foundry.applications.api.DialogV2.confirm({
                                window: { title: localize("ConfirmDelete.Title") },
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
            DestroyableManager.instance.observe(tagify);
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

        this.languagesManager.activateListeners(html);
    }

    override async getData(): Promise<HomebrewElementsSheetData> {
        const data = await super.getData();
        this.languagesManager ??= new LanguagesManager(this);

        const damageCategories = R.pick(CONFIG.PF2E.damageCategories, ["physical", "energy"]);
        const languageRarities = this.languagesManager.getSheetData();

        return {
            ...data,
            languageRarities,
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
        options?: appv1.api.OnSubmitFormOptions,
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
        const data: Partial<HomebrewSubmitData> = fu.expandObject(original);

        // Sanitize damage types data, including ensuring they are valid font awesome icons
        if ("damageTypes" in data && !!data.damageTypes && typeof data.damageTypes === "object") {
            data.damageTypes = Object.values(data.damageTypes);
            for (const type of data.damageTypes) {
                type.category ||= null;
                const sanitized = sluggify(type.icon ?? "");
                type.icon = sanitized.startsWith("fa-") ? sanitized : null;
            }
        }
        data.languageRarities = this.cache.languageRarities;

        return data;
    }

    protected override async _updateObject(event: Event, data: Record<HomebrewTraitKey, HomebrewTag[]>): Promise<void> {
        for (const key of HOMEBREW_ELEMENT_KEYS) {
            for (const tag of data[key]) {
                tag.id ??= sluggify(tag.value) as HomebrewTag<typeof key>["id"];
            }
        }

        if (event.type === "submit") {
            const cleanupTasks = HOMEBREW_ELEMENT_KEYS.map((key) => {
                return this.#processDeletions(key, data[key]);
            }).filter((task): task is MigrationBase => !!task);

            // Close without waiting for migrations to complete
            new MigrationRunner().runMigrations(cleanupTasks);
            await super._updateObject(event, data);

            // Process updates
            this.#refreshSettings();
        } else {
            this.languagesManager.onChangeHomebrewLanguages(data.languages ?? []);
            return super._updateObject(event, data);
        }
    }

    #getAllTraitPropagations(listKey: string): ValueOf<typeof TRAIT_PROPAGATIONS>[number][] {
        if (!objectHasKey(TRAIT_PROPAGATIONS, listKey)) return [];
        return TRAIT_PROPAGATIONS[listKey].flatMap((p) => [p, ...this.#getAllTraitPropagations(p)]);
    }

    /** Prepare and run a migration for each set of tag deletions from a tag map */
    #processDeletions(listKey: HomebrewTraitKey, newTagList: HomebrewTag[]): MigrationBase | null {
        const oldTagList = game.settings.get("pf2e", `homebrew.${listKey}`);
        const newIDList = newTagList.map((tag) => tag.id);
        const deletions: string[] = oldTagList.flatMap((oldTag) => (newIDList.includes(oldTag.id) ? [] : oldTag.id));

        const coreElements = this.#getConfigRecord(listKey);
        for (const id of deletions) {
            delete coreElements[id];
            for (const recordKey of this.#getAllTraitPropagations(listKey)) {
                const secondaryRecord: Record<string, string> = CONFIG.PF2E[recordKey];
                delete secondaryRecord[id];
            }
        }

        return game.user.isGM && deletions.length > 0 ? prepareCleanup(listKey, deletions) : null;
    }

    onInit(): void {
        this.#refreshSettings();
        this.#registerModuleTags();
        new DamageTypeManager().updateSettings();

        // Add additional skills if there any
        const moduleData = HomebrewElements.moduleData;
        if (Object.keys(moduleData.skills).length > 0) {
            CONFIG.PF2E.skills = Object.freeze({
                ...CONFIG.PF2E.skills,
                ...R.mapValues(moduleData.skills, (data) => ({
                    label: data.label,
                    attribute: data.attribute,
                })),
            });
        }
    }

    /** Assigns all homebrew data stored in the world's settings to their relevant locations */
    #refreshSettings(): void {
        const reservedTerms = HomebrewElements.reservedTerms;

        // Add custom traits from settings
        for (const listKey of HOMEBREW_ELEMENT_KEYS) {
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
                (app): app is appv1.api.DocumentSheet =>
                    app instanceof appv1.sheets.ActorSheet || app instanceof ItemSheetPF2e,
            );
            for (const sheet of sheets) {
                sheet.render();
            }
        }
    }

    /** Register homebrew elements stored in a prescribed location in module flags */
    #registerModuleTags(): void {
        const settings = HomebrewElements.moduleData;
        for (const [recordKey, tags] of R.entries(settings.traits)) {
            if (tags.length > 0) {
                this.#updateConfigRecords(tags, recordKey);
            }
        }

        for (const [trait, description] of Object.entries(settings.traitDescriptions)) {
            const hbKey = trait as keyof typeof CONFIG.PF2E.traitsDescriptions;
            CONFIG.PF2E.traitsDescriptions[hbKey] = description;
        }
    }

    #getConfigRecord(key: HomebrewTraitKey): Record<string, string> {
        if (key === "baseArmors") return CONFIG.PF2E.baseArmorTypes;
        if (key === "baseWeapons") return CONFIG.PF2E.baseWeaponTypes;
        return CONFIG.PF2E[key];
    }

    #updateConfigRecords(elements: HomebrewTag[], listKey: HomebrewTraitKey): void {
        // The base-weapons map only exists in the localization file
        const coreElements = this.#getConfigRecord(listKey);
        for (const element of elements) {
            coreElements[element.id] = element.value;
            for (const recordKey of this.#getAllTraitPropagations(listKey)) {
                const record: Record<string, string> = CONFIG.PF2E[recordKey];
                record[element.id] = element.value;
            }
        }
    }
}

type HomebrewSubmitData = {
    damageTypes: CustomDamageData[];
    languages: HomebrewTag<"languages">[];
    languageRarities: LanguageSettings;
} & Record<string, unknown> & { clear(): void };

interface HomebrewElements extends SettingsMenuPF2e {
    constructor: typeof HomebrewElements;
    cache: HomebrewSubmitData;
}

export { HomebrewElements };
