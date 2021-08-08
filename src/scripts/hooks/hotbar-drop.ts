import {
    createActionMacro,
    createItemMacro,
    createSkillMacro,
    createToggleEffectMacro,
    createTogglePropertyMacro,
} from "@scripts/macros/hotbar";
import { ItemPF2e, EffectPF2e } from "@item/index";

export function listen() {
    Hooks.on("hotbarDrop", async (_bar, data: any, slot) => {
        const slotInt = Number(slot);
        // check for item link
        let item: ItemPF2e | undefined;
        if (data.type === "Item" && data.id) {
            const prefix = data.pack ? `Compendium.${data.pack}` : "Item";
            item = (await fromUuid(`${prefix}.${data.id}` as CompendiumUUID)) as ItemPF2e;
        }

        if (item instanceof EffectPF2e) {
            createToggleEffectMacro(data.pack, item, slotInt);
        } else if (data.type === "Item") {
            createItemMacro(data.data, slotInt);
            return false;
        } else if (data.type === "Action") {
            createActionMacro(data.index, data.actorId, slotInt);
            return false;
        } else if (data.type === "Skill") {
            createSkillMacro(data.skill, data.skillName, data.actorId, slotInt);
        } else if (data.type === "Toggle") {
            createTogglePropertyMacro(data.property, data.label, data.actorId, slotInt);
        }

        return true;
    });
}
