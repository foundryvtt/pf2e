import { ActorPF2e } from "@actor";
import { createShoddyPenalty } from "@actor/character/helpers.ts";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { ArmorPF2e } from "@item";
import { ZeroToFour } from "@module/data.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { sluggify } from "@util";
import * as R from "remeda";
import { Statistic, StatisticData, StatisticTraceData } from "./index.ts";

class ArmorStatistic extends Statistic {
    details: string;

    get item(): ArmorPF2e<ActorPF2e> | null {
        return this.actor.isOfType("character") ? this.actor.wornArmor : null;
    }

    constructor(actor: ActorPF2e, data: Omit<ArmorStatisticData, "domains" | "label" | "slug"> = {}) {
        data.rank ??= 1;
        const ability = actor.isOfType("creature") ? data.ability ?? "dex" : null;
        const domains = ability ? ["all", `${ability}-based`] : ["all"];
        const fullData: ArmorStatisticData = {
            ...data,
            label: "TYPES.Item.armor",
            slug: "armor",
            ability,
            domains,
            proficient: data.rank > 0,
            dc: { label: "PF2E.ArmorClassLabel", domains: ["ac"], modifiers: [] },
        };

        super(actor, fullData);

        this.details = data.details ?? "";
        const dcModifiers = [...this.dc.modifiers, ...this.#createBonusesAndPenalties()].map((m) => m.clone());
        this.dc.modifiers = [...new StatisticModifier("", dcModifiers, this.dc.options).modifiers];
    }

    /** If this statistic belongs to a PC, create bonuses and penalties from their worn armor */
    #createBonusesAndPenalties(): ModifierPF2e[] {
        const { actor } = this;

        const armor = actor.isOfType("character") ? actor.wornArmor : null;
        const armorSlug = armor?.baseType ?? armor?.slug ?? sluggify(armor?.name ?? "");
        const itemBonus = armor
            ? new ModifierPF2e({
                  label: armor.name,
                  type: "item",
                  slug: armorSlug,
                  modifier: armor.acBonus,
                  item: armor,
                  adjustments: extractModifierAdjustments(
                      actor.synthetics.modifierAdjustments,
                      ["all", "ac"],
                      armorSlug
                  ),
              })
            : null;

        return R.compact([itemBonus, createShoddyPenalty(actor, armor, this.dc.domains), this.#createShieldBonus()]);
    }

    #createShieldBonus(): ModifierPF2e | null {
        const { actor } = this;
        if (!actor.isOfType("character", "npc")) return null;

        const shieldData = actor.system.attributes.shield;
        const slug = "raised-shield";

        return shieldData.raised && !shieldData.broken
            ? new ModifierPF2e({
                  label: shieldData.name,
                  slug,
                  adjustments: extractModifierAdjustments(
                      actor.synthetics.modifierAdjustments,
                      ["all", "dex-based", "ac"],
                      slug
                  ),
                  type: "circumstance",
                  modifier: shieldData.ac,
              })
            : null;
    }

    override getTraceData(): ArmorClassTraceData {
        return {
            ...super.getTraceData({ value: "dc" }),
            details: this.details,
            breakdown: this.dc.breakdown,
        };
    }
}

interface ArmorStatisticData extends StatisticData {
    rank?: ZeroToFour;
    details?: string;
}

interface ArmorClassTraceData extends StatisticTraceData {
    details: string;
}

export { ArmorClassTraceData, ArmorStatistic };
