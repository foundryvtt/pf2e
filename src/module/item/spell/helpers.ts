import { createEffectAreaLabel } from "@item/helpers.ts";
import { localizer } from "@util";
import type { SpellPF2e } from "./index.ts";

function createSpellRankLabel(spell: SpellPF2e, castRank?: number): string {
    const typeLabel = spell.isCantrip
        ? _loc("PF2E.TraitCantrip")
        : spell.isFocusSpell
          ? _loc("PF2E.TraitFocus")
          : spell.isRitual
            ? _loc("PF2E.Item.Spell.Ritual.Label")
            : _loc("TYPES.Item.spell");

    return castRank ? _loc("PF2E.ItemLevel", { type: typeLabel, level: castRank }) : typeLabel;
}

async function createDescriptionPrepend(
    spell: SpellPF2e,
    { includeTraditions }: { includeTraditions: boolean },
): Promise<string> {
    const traditions = includeTraditions
        ? spell.system.traits.traditions
              .map((t) => _loc(CONFIG.PF2E.magicTraditions[t]).toLocaleLowerCase(game.i18n.lang))
              .sort((a, b) => a.localeCompare(b, game.i18n.lang))
              .join(", ")
        : null;

    const defenseLabel = ((): string | null => {
        const defense = spell.system.defense;
        if (!defense) return null;
        const passive = defense.passive ? getPassiveDefenseLabel(defense.passive.statistic, { localize: true }) : null;
        const partialSaveLabel = defense.save ? _loc(CONFIG.PF2E.saves[defense.save.statistic]) : null;
        const save =
            partialSaveLabel && defense.save?.basic
                ? _loc("PF2E.Item.Spell.Defense.BasicDefense", { save: partialSaveLabel })
                : partialSaveLabel;
        return passive && save ? _loc("PF2E.ListPartsAnd.two", { first: passive, second: save }) : (passive ?? save);
    })();

    const durationLabel = ((): string | null => {
        const duration = spell.system.duration;
        const textDuration = duration.value.trim();
        if (duration.sustained) {
            const localize = localizer("PF2E.Item.Spell.Sustained");
            const label = textDuration === "" ? localize("Label") : localize("Duration", { maximum: textDuration });
            return game.i18n.lang === "de" ? label : label.toLocaleLowerCase(game.i18n.lang);
        }
        return textDuration || null;
    })();

    const areaLabel = (() => {
        const label = spell.area?.label;
        if (!label) return null;
        const baseLabel = spell._source.system.area ? createEffectAreaLabel(spell._source.system.area) : label;
        return { label, baseLabel };
    })();

    const templatePath = `systems/${SYSTEM_ID}/templates/items/partials/spell-description-prepend.hbs`;
    const formatArgs = {
        traditions,
        cast: spell.actionGlyph ? null : spell.system.time.value || null,
        cost: spell.system.cost.value?.trim() || null,
        secondaryCasters: spell.system.ritual?.secondary.casters || null,
        primaryCheck: spell.system.ritual?.primary.check?.trim() || null,
        secondaryChecks: spell.system.ritual?.secondary.checks.trim() || null,
        range: spell.system.range.value.trim() || null,
        targets: spell.system.target.value.trim() || null,
        area: areaLabel,
        defense: defenseLabel,
        duration: durationLabel,
    };
    const rendered = await fa.handlebars.renderTemplate(templatePath, formatArgs);

    return rendered.trim();
}

function getPassiveDefenseLabel(statistic: string, { localize = false } = {}): string | null {
    const label = ((): string | null => {
        switch (statistic) {
            case "ac":
                return "PF2E.Check.DC.Specific.armor";
            case "fortitude-dc":
                return "PF2E.Check.DC.Specific.fortitude";
            case "reflex-dc":
                return "PF2E.Check.DC.Specific.reflex";
            case "will-dc":
                return "PF2E.Check.DC.Specific.will";
            default:
                return null;
        }
    })();
    return label && localize ? _loc(label) : label;
}

export { createDescriptionPrepend, createSpellRankLabel, getPassiveDefenseLabel };
