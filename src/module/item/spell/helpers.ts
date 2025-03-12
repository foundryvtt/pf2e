import { localizer } from "@util";
import type { SpellArea, SpellPF2e } from "./index.ts";

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

function createSpellAreaLabel(areaData: SpellArea): string {
    const formatString = "PF2E.Item.Spell.Area";
    const shape = game.i18n.localize(`PF2E.Area.Shape.${areaData.type}`);

    // Handle special cases of very large areas
    const largeAreaLabel = {
        1320: "PF2E.Area.Size.Quarter",
        2640: "PF2E.Area.Size.Half",
        5280: "1",
    }[areaData.value];
    if (largeAreaLabel) {
        const size = game.i18n.localize(largeAreaLabel);
        const unit = game.i18n.localize("PF2E.Area.Size.Mile");
        return game.i18n.format(formatString, { shape, size, unit, units: unit });
    }

    const size = Number(areaData.value);
    const unit = game.i18n.localize("PF2E.Foot.Label");
    const units = game.i18n.localize("PF2E.Foot.Plural");
    return game.i18n.format(formatString, { shape, size, unit, units });
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

    const defenseLabel = ((): string | null => {
        const defense = spell.system.defense;
        if (!defense) return null;
        const passive = defense.passive ? getPassiveDefenseLabel(defense.passive.statistic, { localize: true }) : null;
        const partialSaveLabel = defense.save ? game.i18n.localize(CONFIG.PF2E.saves[defense.save.statistic]) : null;
        const save =
            partialSaveLabel && defense.save?.basic
                ? game.i18n.format("PF2E.Item.Spell.Defense.BasicDefense", { save: partialSaveLabel })
                : partialSaveLabel;
        return passive && save
            ? game.i18n.format("PF2E.ListPartsAnd.two", { first: passive, second: save })
            : (passive ?? save);
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
        const baseLabel = spell._source.system.area ? createSpellAreaLabel(spell._source.system.area) : label;
        return { label, baseLabel };
    })();

    const templatePath = "systems/pf2e/templates/items/partials/spell-description-prepend.hbs";
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
    const rendered = await renderTemplate(templatePath, formatArgs);

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
    return label && localize ? game.i18n.localize(label) : label;
}

export { createDescriptionPrepend, createSpellAreaLabel, createSpellRankLabel, getPassiveDefenseLabel };
