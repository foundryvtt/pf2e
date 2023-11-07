import type { ActorPF2e } from "@actor";
import { SpellSource } from "@item/spell/index.ts";
import { ZeroToTen } from "@module/data.ts";
import { ErrorPF2e, ordinalString } from "@util";
import * as R from "remeda";

function onClickCreateSpell(actor: ActorPF2e, data: Record<string, unknown>): void {
    if (!data.location) {
        throw ErrorPF2e("Unexpected missing spellcasting-entry location");
    }

    const rank = Number(data.level ?? 1) as ZeroToTen;
    const newLabel = game.i18n.localize("PF2E.NewLabel");
    const [rankLabel, spellLabel] =
        rank > 0
            ? [
                  game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) }),
                  game.i18n.localize(data.location === "rituals" ? "PF2E.SpellCategoryRitual" : "PF2E.SpellLabel"),
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
        source.system = mergeObject(source.system, { category: { value: "ritual" } });
    }

    actor.createEmbeddedDocuments("Item", [source]);
}

export { onClickCreateSpell };
