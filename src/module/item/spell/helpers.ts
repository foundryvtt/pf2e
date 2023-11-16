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

export { createSpellRankLabel };
