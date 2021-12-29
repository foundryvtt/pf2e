import {
    createActionMacro,
    createItemMacro,
    createSkillMacro,
    createToggleEffectMacro,
    createTogglePropertyMacro,
} from "@scripts/macros/hotbar";
import { ItemPF2e, EffectPF2e } from "@item/index";

export const HotbarDrop = {
    listen: (): void => {
        Hooks.on("hotbarDrop", async (_bar, data: any, slot) => {
            const slotInt = Number(slot);

            if ("pf2e" in data) {
                if (data.pf2e.type === "Action") {
                    createActionMacro(data.pf2e.index, data.actorId, slotInt);
                    return false;
                } else if (data.pf2e.type === "Toggle") {
                    createTogglePropertyMacro(data.pf2e.property, data.pf2e.label, data.actorId, slotInt);
                    return true;
                }
            }

            // check for item link
            let item: ItemPF2e | undefined;
            if (data.type === "Item" && data.id && typeof data.id === "string") {
                const pack: unknown = data.pack;
                const prefix = pack && typeof pack === "string" ? (`Compendium.${pack}` as const) : ("Item" as const);
                item = (await fromUuid(`${prefix}.${data.id}`)) as ItemPF2e;
            }

            if (item instanceof EffectPF2e) {
                createToggleEffectMacro(data.pack, item, slotInt);
            } else if (data.type === "Item") {
                createItemMacro(data.data, slotInt);
                return false;
            } else if (data.type === "Skill") {
                createSkillMacro(data.skill, data.skillName, data.actorId, slotInt);
            }

            return true;
        });
    },
};
