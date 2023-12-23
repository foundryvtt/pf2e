import { localizer } from "@util";
import type { SpellPF2e } from "./index.ts";

function createSpellRankLabel(spell: SpellPF2e, castRank?: number): string {
    const typeLabel = spell.isCantrip
        ? game.i18n.localize("PF2E.TraitCantrip")
        : spell.isFocusSpell
          ? game.i18n.localize("PF2E.TraitFocus")
          : spell.isRitual
            ? game.i18n.localize("PF2E.Item.Spell.Ritual.Label")
            : game.i18n.localize("TYPES.Item.spell");

    return castRank ? game.i18n.format("PF2E.ItemLevel", { type: typeLabel, level: castRank }) : typeLabel;
}

async function createDescriptionPrepend(
    spell: SpellPF2e,
    { includeTraditions }: { includeTraditions: boolean },
): Promise<string> {
    const traditions = includeTraditions
        ? spell.system.traits.traditions
              .map((t) => game.i18n.localize(CONFIG.PF2E.magicTraditions[t]).toLocaleLowerCase(game.i18n.lang))
              .sort((a, b) => a.localeCompare(b, game.i18n.lang))
              .join(", ")
        : null;
    const durationLabel = ((): string => {
        const duration = spell.system.duration;
        const textDuration = duration.value.trim();
        if (duration.sustained) {
            const localize = localizer("PF2E.Item.Spell.Sustained");
            const label = textDuration === "" ? localize("Label") : localize("Duration", { maximum: textDuration });
            return game.i18n.lang === "de" ? label : label.toLocaleLowerCase(game.i18n.lang);
        }
        return textDuration;
    })();
    const templatePath = "systems/pf2e/templates/items/partials/spell-description-prepend.hbs";
    const rendered = (await renderTemplate(templatePath, { duration: durationLabel, spell, traditions })).trim();

    return rendered ? `${rendered}\n<hr />` : "";
}

export { createDescriptionPrepend, createSpellRankLabel };
