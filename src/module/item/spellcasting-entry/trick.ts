import { ActorPF2e } from "@actor";
import { AbilityString, SkillLongForm } from "@actor/types.ts";
import { SpellPF2e } from "@item";
import { extractModifiers } from "@module/rules/helpers.ts";
import { Statistic } from "@system/statistic/index.ts";
import { CastOptions, SpellcastingEntry, SpellcastingSheetData } from "./types.ts";
import { ErrorPF2e } from "@util/misc.ts";
import { MagicTradition } from "@item/spell/types.ts";

const TRICK_MAGIC_SKILLS = ["arcana", "nature", "occultism", "religion"] as const;
type TrickMagicItemSkill = (typeof TRICK_MAGIC_SKILLS)[number];

const TrickMagicTradition = {
    arcana: "arcane",
    nature: "primal",
    occultism: "occult",
    religion: "divine",
} as const;

const traditionSkills = {
    arcane: "arcana",
    divine: "religion",
    occult: "occultism",
    primal: "nature",
} as const;

/** A pseudo spellcasting entry used to trick magic item for a single skill */
class TrickMagicItemEntry<TActor extends ActorPF2e = ActorPF2e> implements SpellcastingEntry<TActor> {
    readonly id: string;

    actor: TActor;

    skill: SkillLongForm;

    statistic: Statistic;

    ability: AbilityString;

    tradition: MagicTradition;

    constructor(actor: TActor, skill: TrickMagicItemSkill) {
        if (!actor.isOfType("character")) {
            throw ErrorPF2e("Trick magic entries may only be constructed with PCs");
        }
        this.actor = actor;
        this.skill = skill;
        this.id = `trick-${this.skill}`;

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
        const tradition = (this.tradition = TrickMagicTradition[skill]);

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

    get name(): string {
        return game.i18n.localize("PF2E.TrickMagicItemPopup.Title");
    }

    /** Unused since a Trick Magic Item ability isn't displayed in an actor sheet */
    get sort(): number {
        return 0;
    }

    get category(): "items" {
        return "items";
    }

    get spells(): null {
        return null;
    }

    get isFlexible(): false {
        return false;
    }

    get isFocusPool(): false {
        return false;
    }

    get isInnate(): false {
        return false;
    }

    get isPrepared(): false {
        return false;
    }

    get isRitual(): false {
        return false;
    }

    get isSpontaneous(): false {
        return false;
    }

    /** Currently no checks for whether a magic item can be tricked */
    canCast(): boolean {
        return true;
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

    async getSheetData(): Promise<SpellcastingSheetData> {
        return {
            id: this.id,
            name: this.name,
            statistic: this.statistic.getChatData(),
            tradition: this.tradition,
            category: "items",
            hasCollection: false,
            sort: 0,
            levels: [],
            spellPrepList: null,
        };
    }
}

export { TRICK_MAGIC_SKILLS, TrickMagicItemEntry, TrickMagicItemSkill, traditionSkills };
