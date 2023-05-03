import type { ActorPF2e } from "@actor";
import { ErrorPF2e } from "@util";

function onClickCreateSpell(actor: ActorPF2e, data: Record<string, string | string[] | number | undefined>): void {
    if (!data.location) {
        throw ErrorPF2e("Unexpected missing spellcasting-entry location");
    }

    data.level = Number(data.level ?? 1);
    const newLabel = game.i18n.localize("PF2E.NewLabel");
    const [levelLabel, spellLabel] =
        data.level > 0
            ? [
                  game.i18n.localize(`PF2E.SpellLevel${data.level}`),
                  game.i18n.localize(data.location === "rituals" ? "PF2E.SpellCategoryRitual" : "PF2E.SpellLabel"),
              ]
            : ["", game.i18n.localize("PF2E.TraitCantrip")];
    data.name = `${newLabel} ${levelLabel} ${spellLabel}`.replace(/\s{2,}/, " ");
    data["system.traits.value"] = data.level === 0 ? ["cantrip"] : [];
    data["system.level.value"] = data.level || 1;
    data["system.location.value"] = data.location;
    if (data.location === "rituals") {
        data["system.category.value"] = "ritual";
    }

    actor.createEmbeddedDocuments("Item", [expandObject(data)]);
}

export { onClickCreateSpell };
