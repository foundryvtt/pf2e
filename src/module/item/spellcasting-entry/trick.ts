import { CharacterPF2e } from "@actor";
import { AbilityString } from "@actor/data";
import { SpellPF2e } from "@item";
import { AbilityModifier, ProficiencyModifier } from "@module/modifiers";
import { Statistic } from "@system/statistic";

export const TRICK_MAGIC_SKILLS = ["arc", "nat", "occ", "rel"] as const;
export type TrickMagicItemSkill = typeof TRICK_MAGIC_SKILLS[number];

const TrickMagicTradition = {
    arc: "arcane",
    nat: "primal",
    occ: "occult",
    rel: "religion",
};

/** A pseudo spellcasting entry used to trick magic item for a single skill */
export class TrickMagicItemEntry {
    statistic: Statistic;

    ability: AbilityString;

    constructor(actor: CharacterPF2e, skill: TrickMagicItemSkill) {
        const { abilities } = actor.data.data;
        const { ability, value } = (["int", "wis", "cha"] as const)
            .map((ability) => {
                return { ability, value: abilities[ability].value };
            })
            .reduce((highest, next) => {
                if (next.value > highest.value) {
                    return next;
                } else {
                    return highest;
                }
            });

        this.ability = ability;
        const tradition = TrickMagicTradition[skill];
        const skillRank = actor.data.data.skills[skill].rank;
        const baseModifiers = [
            AbilityModifier.fromScore(ability, value),
            ProficiencyModifier.fromLevelAndRank(actor.level, Math.max(0, skillRank - 2)),
        ];

        this.statistic = new Statistic(actor, {
            name: game.i18n.format(`PF2E.SpellAttack.${tradition}`),
            modifiers: baseModifiers,
            check: {
                type: "spell-attack-roll",
            },
            dc: {},
        });
    }

    async cast(spell: SpellPF2e, options: { level?: number } = {}) {
        const level = options.level ?? spell.heightenedLevel;
        try {
            spell.trickMagicEntry = this;
            await spell.toMessage(undefined, { data: { spellLvl: level } });
        } finally {
            spell.trickMagicEntry = undefined;
        }
    }
}
