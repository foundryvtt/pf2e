import type { ActorPF2e } from "@actor";
import type { OneToTen, ZeroToTen } from "@module/data.ts";
import { Statistic } from "@system/statistic/statistic.ts";
import * as R from "remeda";
import type { SpellSlotGroupId } from "./collection.ts";
import type { SpellcastingEntry } from "./types.ts";

/** Create a statistic that draws from limited domains for the purpose of counteracting. */
function createCounteractStatistic<TActor extends ActorPF2e>(ability: SpellcastingEntry<TActor>): Statistic<TActor> {
    const actor = ability.actor;

    // NPCs have neither a proficiency bonus nor specified attribute modifier: use their base attack roll modifier
    const baseModifier = actor.isOfType("npc")
        ? ability.statistic.check.modifiers.find((m) => m.type === "untyped" && m.slug === "base")?.clone()
        : null;

    return new Statistic(actor, {
        slug: "counteract",
        label: "PF2E.Item.Spell.Counteract.Label",
        attribute: ability.statistic.attribute,
        rank: ability.statistic.rank || 1,
        check: { type: "check", modifiers: [baseModifier].filter(R.isTruthy) },
    });
}

function spellSlotGroupIdToNumber(groupId: SpellSlotGroupId): ZeroToTen;
function spellSlotGroupIdToNumber(groupId: Maybe<string | number>): ZeroToTen | null;
function spellSlotGroupIdToNumber(groupId: Maybe<string | number>): ZeroToTen | null {
    if (groupId === "cantrips") return 0;
    const numericValue = Number(groupId ?? NaN);
    return numericValue.between(0, 10) ? (numericValue as ZeroToTen) : null;
}

/** Try to coerce some value (typically from user input) to a slot group ID */
function coerceToSpellGroupId(value: unknown): SpellSlotGroupId | null {
    if (value === "cantrips") return value;
    const numericValue = Number(value) || NaN;
    return numericValue.between(1, 10) ? (numericValue as OneToTen) : null;
}

export { coerceToSpellGroupId, createCounteractStatistic, spellSlotGroupIdToNumber };
