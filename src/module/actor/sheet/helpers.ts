import type { ActorPF2e } from "@actor";
import { Sense } from "@actor/creature/sense.ts";
import { AbilityItemPF2e, FeatPF2e, PhysicalItemPF2e } from "@item";
import { Bulk } from "@item/physical/bulk.ts";
import { SpellSource } from "@item/spell/index.ts";
import { coerceToSpellGroupId } from "@item/spellcasting-entry/helpers.ts";
import { ErrorPF2e, getActionGlyph, ordinalString } from "@util";
import { traitSlugToObject } from "@util/tags.ts";
import * as R from "remeda";
import { AbilityViewData } from "./data-types.ts";

function onClickCreateSpell(actor: ActorPF2e, data: Record<string, string | undefined>): void {
    if (!data.location) {
        throw ErrorPF2e("Unexpected missing spellcasting-entry location");
    }

    const groupId = coerceToSpellGroupId(data.groupId);
    const rank = typeof groupId === "number" ? groupId : 1;
    const newLabel = game.i18n.localize("PF2E.NewLabel");
    const [rankLabel, spellLabel] =
        groupId === "cantrips"
            ? [null, game.i18n.localize("PF2E.TraitCantrip")]
            : [
                  game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) }),
                  game.i18n.localize(data.location === "rituals" ? "PF2E.Item.Spell.Ritual.Label" : "TYPES.Item.spell"),
              ];
    const source = {
        type: "spell",
        name: [newLabel, rankLabel, spellLabel].filter(R.isTruthy).join(" "),
        system: {
            level: { value: rank },
            location: { value: String(data.location) },
            traits: {
                value: groupId === "cantrips" ? ["cantrip"] : [],
            },
        },
    } satisfies DeepPartial<SpellSource>;

    if (data.location === "rituals") {
        source.system = fu.mergeObject(source.system, { category: { value: "ritual" } });
    }

    actor.createEmbeddedDocuments("Item", [source]);
}

/** Create a price label like "L / 10" when appropriate. */
function createBulkPerLabel(item: PhysicalItemPF2e): string {
    return item.system.bulk.per === 1 || item.system.bulk.value === 0
        ? item.system.quantity === 1
            ? item.bulk.toString()
            : new Bulk(item.system.bulk.value).toString()
        : `${new Bulk(item.system.bulk.value)} / ${item.system.bulk.per}`;
}

/** Returns a sense list with all redundant senses removed (such as low light vision on actors with darkvision) */
function condenseSenses(senses: Sense[]): Sense[] {
    const senseTypes = senses.map((s) => s.type);
    if (senseTypes.includes("greater-darkvision")) {
        senseTypes.findSplice((t) => t === "low-light-vision");
        senseTypes.findSplice((t) => t === "darkvision");
    }
    if (senseTypes.includes("darkvision")) senseTypes.findSplice((t) => t === "low-light-vision");
    return senses.filter((r) => senseTypes.includes(r.type));
}

/** Creates ability or feat view data for actor sheet actions rendering */
function createAbilityViewData(item: AbilityItemPF2e | FeatPF2e): AbilityViewData {
    return {
        ...R.pick(item, ["id", "uuid", "img", "name", "actionCost", "frequency"]),
        glyph: getActionGlyph(item.actionCost),
        usable: !!item.system.selfEffect || !!item.system?.frequency || !!item.crafting,
        traits: item.system.traits.value.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits)),
        has: {
            aura: item.traits.has("aura") || item.system.rules.some((r) => r.key === "Aura"),
            deathNote: item.isOfType("action") && item.system.deathNote,
            selfEffect: !!item.system.selfEffect,
        },
    };
}

export { condenseSenses, createAbilityViewData, createBulkPerLabel, onClickCreateSpell };
