import { ActorPF2e } from "@actor";
import type { Language } from "@actor/creature/types.ts";
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

        return {
            ...sheetData,
            hasRarity: true,
            details,
            choices: R.mapValues(sheetData.choices, (data, key): ChoiceData => {
                const language = key as Language;
                const rarities = game.settings.get("pf2e", "homebrew_languageRarities");

                const tags = {
                    common: { slug: "common", label: game.i18n.localize(CONFIG.PF2E.rarityTraits.common) },
                    uncommon: { slug: "uncommon", label: game.i18n.localize(CONFIG.PF2E.rarityTraits.uncommon) },
                    rare: { slug: "rare", label: game.i18n.localize(CONFIG.PF2E.rarityTraits.rare) },
                    secret: { slug: "secret", label: game.i18n.localize(CONFIG.PF2E.actionTraits.secret) },
                };

                const rarity = ((): { slug: string; label: string } => {
                    /** @todo once this is configurable in homebrew settings, show which language is "Common". */
                    if (language === "common") {
                        // const localize = localizer("PF2E.Actor.Creature.Language");
                        // data.label = localize("CommonTongue", { language: localize(rarities.common) });
                        return tags.common;
                    }
                    if (rarities.uncommon.has(language)) return tags.uncommon;
                    if (rarities.rare.has(language)) return tags.rare;
                    if (rarities.secret.has(language)) return tags.secret;
                    return tags.common;
                })();

                const source = grantedLanguageSources[language] ?? null;

                return { ...data, rarity, source };
            }),
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
