import { ActorPF2e } from "@actor";
import { createProficiencyModifier } from "@actor/modifiers.ts";
import { AttributeString, SkillLongForm } from "@actor/types.ts";
import { SpellPF2e } from "@item";
import { MagicTradition } from "@item/spell/types.ts";
import { extractModifiers } from "@module/rules/helpers.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e } from "@util/misc.ts";
import * as R from "remeda";
import { CastOptions, SpellcastingEntry, SpellcastingSheetData } from "./types.ts";

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

    attribute: AttributeString;

    /** @deprecated */
    get ability(): AttributeString {
        fu.logCompatibilityWarning(
            "`TrickMagicItemEntry#ability` is deprecated. Use `TrickMagicItemEntry#attribute` instead.",
            { since: "5.3.0", until: "6.0.0" },
        );
        return this.attribute;
    }

    tradition: MagicTradition;

    constructor(actor: TActor, skill: TrickMagicItemSkill) {
        if (!actor.isOfType("character")) {
            throw ErrorPF2e("Trick magic entries may only be constructed with PCs");
        }
        this.actor = actor;
        this.skill = skill;
        this.id = `trick-${this.skill}`;

        const attributes = actor.abilities;
        const { attribute } = (["int", "wis", "cha"] as const)
            .map((attribute) => ({ attribute, mod: attributes[attribute].mod }))
            .reduce((highest, next) => {
                if (next.mod > highest.mod) {
                    return next;
                } else {
                    return highest;
                }
            });

        this.attribute = attribute;
        const tradition = (this.tradition = TrickMagicTradition[skill]);

        const domains = [`${attribute}-based`, "all", "spell-attack-dc"];
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
        const levelProficiencyBonus =
            trickRank === 0 && !game.pf2e.settings.variants.pwol
                ? createProficiencyModifier({ actor, rank: 0, domains, addLevel: true })
                : null;

        this.statistic = new Statistic(actor, {
            slug: `trick-${tradition}`,
            label: CONFIG.PF2E.magicTraditions[tradition],
            attribute: attribute,
            rank: trickRank,
            modifiers: R.compact([levelProficiencyBonus, ...extractModifiers(actor.synthetics, domains)]),
            domains,
            check: {
                type: "attack-roll",
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

    get isEphemeral(): true {
        return true;
    }

    /** Currently no checks for whether a magic item can be tricked */
    canCast(): boolean {
        return true;
    }

    async cast(spell: SpellPF2e, options: CastOptions = {}): Promise<void> {
        const { rollMode, message } = options;
        const castRank = spell.computeCastRank(spell.rank);
        if (message === false) return;

        spell = spell.loadVariant({ entryId: this.id }) ?? spell;
        await spell.toMessage(null, { rollMode, data: { castRank } });
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
            groups: [],
            usesSpellProficiency: false,
            prepList: null,
            isEphemeral: true,
        };
    }
}

export { TRICK_MAGIC_SKILLS, TrickMagicItemEntry, traditionSkills };
export type { TrickMagicItemSkill };
