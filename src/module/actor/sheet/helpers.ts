import type { ActorPF2e } from "@actor";
import { SpellSource } from "@item/spell/index.ts";
import { ZeroToTen } from "@module/data.ts";
import { ErrorPF2e } from "@util";
import * as R from "remeda";

function onClickCreateSpell(actor: ActorPF2e, data: Record<string, unknown>): void {
    if (!data.location) {
        throw ErrorPF2e("Unexpected missing spellcasting-entry location");
    }

    const level = Number(data.level ?? 1) as ZeroToTen;
    const newLabel = game.i18n.localize("PF2E.NewLabel");
    const [levelLabel, spellLabel] =
        level > 0
            ? [
                  game.i18n.localize(`PF2E.SpellLevel${data.level}`),
                  game.i18n.localize(data.location === "rituals" ? "PF2E.SpellCategoryRitual" : "PF2E.SpellLabel"),
              ]
            : [null, game.i18n.localize("PF2E.TraitCantrip")];
    const source = {
        type: "spell",
        name: R.compact([newLabel, levelLabel, spellLabel]).join(" "),
        system: {
            level: { value: level || 1 },
            location: { value: String(data.location) },
            traits: {
                value: level === 0 ? ["cantrip"] : [],
            },
        },
    } satisfies DeepPartial<SpellSource>;

    if (data.location === "rituals") {
        source.system = mergeObject(source.system, { category: { value: "ritual" } });
    }

    actor.createEmbeddedDocuments("Item", [source]);
}

export { onClickCreateSpell };
