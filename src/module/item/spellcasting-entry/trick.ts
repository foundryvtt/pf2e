import { CharacterPF2e } from "@actor";
import { AbilityString } from "@actor/types";
import { SpellPF2e } from "@item";
import { extractModifiers } from "@module/rules/util";
import { Statistic } from "@system/statistic";
import { BaseSpellcastingEntry, CastOptions } from "./data";

export const TRICK_MAGIC_SKILLS = ["arcana", "nature", "occultism", "religion"] as const;
export type TrickMagicItemSkill = typeof TRICK_MAGIC_SKILLS[number];

const TrickMagicTradition = {
    arcana: "arcane",
    nature: "primal",
    occultism: "occult",
    religion: "divine",
} as const;

export const traditionSkills = {
    arcane: "arcana",
    divine: "religion",
    occult: "occultism",
    primal: "nature",
} as const;

/** A pseudo spellcasting entry used to trick magic item for a single skill */
export class TrickMagicItemEntry implements BaseSpellcastingEntry {
    id = `trick-${this.skill}`;

    statistic: Statistic;

    ability: AbilityString;

    tradition = TrickMagicTradition[this.skill];

    constructor(public actor: CharacterPF2e, public skill: TrickMagicItemSkill) {
        const { abilities } = actor;
        const { ability } = (["int", "wis", "cha"] as const)
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

        const selectors = [`${ability}-based`, "all", "spell-attack-dc"];
        const attackSelectors = [
            `${tradition}-spell-attack`,
            "spell-attack",
            "spell-attack-roll",
            "attack",
            "attack-roll",
        ];
        const saveSelectors = [`${tradition}-spell-dc`, "spell-dc"];

        const skillRank = actor.skills[skill].rank;
        const trickRank = skillRank === 4 ? 2 : skillRank === 3 ? 1 : 0;

        this.statistic = new Statistic(actor, {
            slug: `trick-${tradition}`,
            label: CONFIG.PF2E.magicTraditions[tradition],
            ability,
            rank: trickRank || "untrained-level",
            modifiers: extractModifiers(actor.synthetics, selectors),
            domains: selectors,
            check: {
                type: "spell-attack-roll",
                modifiers: extractModifiers(actor.synthetics, attackSelectors),
                domains: attackSelectors,
            },
            dc: {
                modifiers: extractModifiers(actor.synthetics, saveSelectors),
                domains: saveSelectors,
            },
        });
    }

    async cast(spell: SpellPF2e, options: CastOptions = {}): Promise<void> {
        const { rollMode, message } = options;
        const castLevel = spell.computeCastLevel(spell.level);
        if (message === false) return;

        try {
            spell.trickMagicEntry = this;
            await spell.toMessage(undefined, { rollMode, data: { castLevel } });
        } finally {
            spell.trickMagicEntry = null;
        }
    }
}
