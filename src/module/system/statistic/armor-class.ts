import type { ActorPF2e, CreaturePF2e } from "@actor";
import { createShoddyPenalty } from "@actor/character/helpers.ts";
import { Modifier, StatisticModifier } from "@actor/modifiers.ts";
import { AttributeString } from "@actor/types.ts";
import type { ArmorPF2e } from "@item";
import { ZeroToFour } from "@module/data.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { sluggify } from "@util";
import * as R from "remeda";
import { Statistic, StatisticData, StatisticTraceData } from "./index.ts";

class ArmorStatistic<TActor extends ActorPF2e = ActorPF2e> extends Statistic<TActor> {
    details: string;

    get item(): ArmorPF2e<TActor> | null {
        return this.actor.isOfType("character") ? this.actor.wornArmor : null;
    }

    constructor(actor: TActor, data: Omit<ArmorStatisticData, "domains" | "label" | "slug"> = {}) {
        data.rank ??= 1;
        const attribute = actor.isOfType("creature") ? (data.attribute ?? "dex") : null;
        const domains = attribute ? ["all", `${attribute}-based`] : ["all"];
        const fullData: ArmorStatisticData = {
            ...data,
            label: "TYPES.Item.armor",
            slug: "armor",
            attribute,
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
    #createBonusesAndPenalties(): Modifier[] {
        const actor = this.actor;
        const armor = actor.isOfType("character") ? actor.wornArmor : null;
        const armorSlug = armor?.baseType ?? armor?.slug ?? sluggify(armor?.name ?? "");
        const itemBonus = armor
            ? new Modifier({
                  label: armor.name,
                  type: "item",
                  slug: armorSlug,
                  modifier: armor.acBonus,
                  adjustments: extractModifierAdjustments(
                      actor.synthetics.modifierAdjustments,
                      ["all", "ac"],
                      armorSlug,
                  ),
              })
            : null;
        return [itemBonus, createShoddyPenalty(actor, armor, this.dc.domains), this.#createShieldBonus()].filter(
            R.isTruthy,
        );
    }

    #createShieldBonus(): Modifier | null {
        const { actor } = this;
        if (!actor.isOfType("character", "npc")) return null;

        const shieldData = actor.system.attributes.shield;
        const slug = "raised-shield";

        return shieldData.raised && !shieldData.broken
            ? new Modifier({
                  label: shieldData.name,
                  slug,
                  adjustments: extractModifierAdjustments(
                      actor.synthetics.modifierAdjustments,
                      ["all", "dex-based", "ac"],
                      slug,
                  ),
                  type: "circumstance",
                  modifier: shieldData.ac,
              })
            : null;
    }

    override getTraceData(this: ArmorStatistic<CreaturePF2e>): ArmorClassTraceData<AttributeString>;
    override getTraceData(): ArmorClassTraceData;
    override getTraceData(): ArmorClassTraceData {
        return {
            ...super.getTraceData({ value: "dc" }),
            breakdown: this.dc.breakdown,
            details: this.details,
            slug: "ac",
        };
    }
}

interface ArmorStatisticData extends StatisticData {
    rank?: ZeroToFour;
    details?: string;
}

interface ArmorClassTraceData<TAttribute extends AttributeString | null = AttributeString | null>
    extends StatisticTraceData<TAttribute> {
    details: string;
    slug: "ac";
}

export { ArmorStatistic, type ArmorClassTraceData };
