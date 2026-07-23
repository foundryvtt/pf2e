import type { CharacterPF2e } from "@actor";
import type { ConsumablePF2e } from "@item";
import { calculateTrickMagicItemCheckDC } from "@item/consumable/spell-consumables.ts";
import { TRICK_MAGIC_SKILLS, TrickMagicItemEntry } from "@item/spellcasting-entry/trick.ts";
import { ErrorPF2e, localizer, tupleHasValue } from "@util";

/** Prompt the user for a skill with which to trick a magic item, then roll the check and cast the embedded spell. */
async function trickMagicItem(item: ConsumablePF2e): Promise<void> {
    const localize = localizer("PF2E.TrickMagicItemPopup");
    if (!item.isOfType("consumable")) {
        throw ErrorPF2e("Unexpected item used for Trick Magic Item");
    }
    if (!item.actor?.isOfType("character")) {
        throw ErrorPF2e(localize("InvalidActor"));
    }
    const consumable = item as ConsumablePF2e<CharacterPF2e>;
    const actor = consumable.actor;
    const checkDC = calculateTrickMagicItemCheckDC(consumable);
    const buttons = TRICK_MAGIC_SKILLS.filter((skill) => skill in checkDC).map((action) => {
        const modifier = actor.skills[action].check.mod;
        return {
            action,
            icon: "fa-solid fa-dice-d20",
            label: `${_loc(CONFIG.PF2E.skills[action].label)} (${modifier < 0 ? "" : "+"}${modifier})`,
        };
    });
    const skill = await foundry.applications.api.DialogV2.wait({
        id: "trick-magic-item-{id}",
        classes: ["column-buttons"],
        window: { title: localize("Title") },
        content: `<p>${localize("Label")}</p>`,
        buttons,
        rejectClose: false,
    });
    if (!tupleHasValue(TRICK_MAGIC_SKILLS, skill)) return;

    actor.skills[skill].check.roll({
        extraRollOptions: ["action:trick-magic-item"],
        dc: { value: checkDC[skill] ?? 0 },
        item: consumable,
    });

    await consumable.castEmbeddedSpell(new TrickMagicItemEntry(actor, skill));
}

export { trickMagicItem };
