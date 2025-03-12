import { ActorPF2e } from "@actor";
import type { Language } from "@actor/creature/types.ts";
import { LANGUAGE_RARITIES } from "@actor/creature/values.ts";
import type { ItemPF2e } from "@item";
import { ErrorPF2e, htmlQueryAll } from "@util";
import * as R from "remeda";
import { TagSelectorBasicData } from "./basic.ts";
import { TagSelectorBasic, type SelectableTagField, type TagSelectorOptions } from "./index.ts";

class LanguageSelector extends TagSelectorBasic<ActorPF2e | ItemPF2e> {
    static override get defaultOptions(): TagSelectorOptions {
        return {
            ...super.defaultOptions,
            id: "language-selector",
            title: "PF2E.Actor.Creature.Language.Plural",
            width: 325,
        };
    }

    declare choices: typeof CONFIG.PF2E.languages;

    constructor(document: ActorPF2e | ItemPF2e, options: Partial<TagSelectorOptions> = {}) {
        super(document, {
            ...options,
            objectProperty: options?.objectProperty ?? "system.details.languages",
        });
    }

    protected override get configTypes(): readonly SelectableTagField[] {
        return ["languages"];
    }

    override async getData(options?: Partial<TagSelectorOptions>): Promise<LanguageSelectorData> {
        const document = this.document;
        if (document instanceof ActorPF2e && !document.isOfType("creature")) {
            throw ErrorPF2e("The languages selector is usable only with creatures");
        }
        const sheetData = await super.getData(options);
        const actor = document instanceof ActorPF2e ? document : null;
        const details = actor
            ? {
                  path: "system.details.languages.details",
                  placeholder: "PF2E.Actor.Creature.Language.DetailsPlaceholder",
                  value: actor.system.details.languages.details.trim(),
              }
            : null;

        const grantedLanguageSources = R.mapToObj(
            actor?.isOfType("character") ? actor.system.build.languages.granted : [],
            (g) => [g.slug, g.source],
        );

        const languagesByRarity = game.pf2e.settings.campaign.languages;

        for (const language of languagesByRarity.unavailable) {
            delete sheetData.choices[language];
        }

        // Move selected languages to top
        const selectedAtTop = Object.fromEntries(R.sortBy(Object.entries(sheetData.choices), ([, v]) => !v.selected));
        // Assign rarities to each option
        const choices = R.mapValues(selectedAtTop, (data, key): ChoiceData => {
            const slug = key as Language;
            const rarityLocKeys = { ...CONFIG.PF2E.rarityTraits, secret: "PF2E.TraitSecret" };
            const tags = R.mapToObj(LANGUAGE_RARITIES, (r) => [
                r,
                { slug: r, label: game.i18n.localize(rarityLocKeys[r]) },
            ]);

            // Disable checkboxes for manually-added languages granted by items so that they'll be cleared on save
            if (
                data.selected &&
                !data.disabled &&
                actor?.isOfType("character") &&
                actor.system.build.languages.granted.some((g) => g.slug === key)
            ) {
                data.disabled = true;
            }

            const rarity = ((): { slug: string; label: string } => {
                if (slug === "common") {
                    if (languagesByRarity.commonLanguage) {
                        const commonLanguage = game.i18n.localize(
                            CONFIG.PF2E.languages[languagesByRarity.commonLanguage],
                        );
                        const locKey = "PF2E.Actor.Creature.Language.CommonLanguage";
                        data.label = game.i18n.format(locKey, { language: commonLanguage });
                    }
                    return tags.common;
                }
                if (languagesByRarity.uncommon.has(slug)) return tags.uncommon;
                if (languagesByRarity.rare.has(slug)) return tags.rare;
                if (languagesByRarity.secret.has(slug)) return tags.secret;
                return tags.common;
            })();
            const source = grantedLanguageSources[slug] ?? null;

            return { ...data, rarity, source };
        });

        return {
            ...sheetData,
            hasRarity: true,
            details,
            choices,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Automatically check or uncheck a speed depending on the value
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[type=number]")) {
            input.addEventListener("input", () => {
                const checkbox = input.closest("li")?.querySelector<HTMLInputElement>("input[type=checkbox]");
                if (checkbox) checkbox.checked = !!Number(input.value);
            });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        await super._updateObject(event, formData);
        const languages =
            "system.details.languages.value" in formData
                ? formData["system.details.languages.value"]
                : formData["system.languages.value"];
        if (Array.isArray(languages)) {
            languages.sort();
        }
    }
}

interface LanguageSelectorData extends TagSelectorBasicData<ActorPF2e | ItemPF2e> {
    choices: Record<string, ChoiceData>;
    hasRarity: true;
}

interface ChoiceData {
    disabled: boolean;
    label: string;
    rarity: { slug: string; label: string } | null;
    selected: boolean;
    source: string | null;
}

export { LanguageSelector };
