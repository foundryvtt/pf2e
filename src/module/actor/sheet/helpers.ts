import type { ActorPF2e } from "@actor";
import { PhysicalItemPF2e } from "@item";
import { Bulk } from "@item/physical/bulk.ts";
import { SpellSource } from "@item/spell/index.ts";
import { ZeroToTen } from "@module/data.ts";
import { ErrorPF2e, ordinalString } from "@util";
import * as R from "remeda";

function onClickCreateSpell(actor: ActorPF2e, data: Record<string, string | undefined>): void {
    if (!data.location) {
        throw ErrorPF2e("Unexpected missing spellcasting-entry location");
    }

    const rank = Number(data.level ?? 1) as ZeroToTen;
    const newLabel = game.i18n.localize("PF2E.NewLabel");
    const [rankLabel, spellLabel] =
        rank > 0
            ? [
                  game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) }),
                  game.i18n.localize(data.location === "rituals" ? "PF2E.Item.Spell.Ritual.Label" : "TYPES.Item.spell"),
              ]
            : [null, game.i18n.localize("PF2E.TraitCantrip")];
    const source = {
        type: "spell",
        name: R.compact([newLabel, rankLabel, spellLabel]).join(" "),
        system: {
            level: { value: rank || 1 },
            location: { value: String(data.location) },
            traits: {
                value: rank === 0 ? ["cantrip"] : [],
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

export { createBulkPerLabel, onClickCreateSpell };
