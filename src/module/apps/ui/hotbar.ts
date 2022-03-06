import { SKILL_ABBREVIATIONS } from "@actor/data/values";
import { EffectPF2e, ItemPF2e } from "@item";
import { MacroPF2e } from "@module/macro";
import {
    createActionMacro,
    createItemMacro,
    createSkillMacro,
    createToggleEffectMacro,
    createTogglePropertyMacro,
} from "@scripts/macros/hotbar";
import { isObject, tupleHasValue } from "@util";

class HotbarPF2e extends Hotbar<MacroPF2e> {
    /** Handle macro creation from non-macros */
    override async _onDrop(event: ElementDragEvent): Promise<void> {
        const li = event.target.closest<HTMLElement>(".macro");
        const slot = Number(li?.dataset.slot) || null;
        if (!slot) return;

        const data: HotbarDropData = TextEditor.getDragEventData(event);
        if (data.type === "Macro") return super._onDrop(event);
        if (Hooks.call("hotbarDrop", this, data, slot) === false) return;

        if (data.type === "Item" && typeof data.id === "string") {
            const prefix = typeof data.pack === "string" ? (`Compendium.${data.pack}` as const) : "Item";
            const item = await fromUuid(`${prefix}.${data.id}`);

            if (item instanceof EffectPF2e) {
                return createToggleEffectMacro(item, slot);
            } else if (item instanceof ItemPF2e) {
                return createItemMacro(item.toObject(), slot);
            }
        } else if (data.type === "Skill" && data.actorId && tupleHasValue(SKILL_ABBREVIATIONS, data.skill)) {
            const skillName = data.skillName ?? game.i18n.localize(CONFIG.PF2E.skills[data.skill]);
            return createSkillMacro(data.skill, skillName, data.actorId, slot);
        } else if (isObject(data.pf2e) && data.actorId) {
            if (data.pf2e.type === "Action" && data.pf2e.index) {
                return createActionMacro(data.pf2e.index, data.actorId, slot);
            } else if (data.pf2e.type === "Toggle") {
                return createTogglePropertyMacro(data.pf2e.property, data.pf2e.label, data.actorId, slot);
            }
        }
    }
}

interface HotbarDropData extends Partial<DropCanvasData> {
    pack?: string;
    actorId?: string;
    slot?: number;
    skill?: string;
    skillName?: string;
    pf2e?: {
        type: string;
        property: string;
        index?: string;
        label: string;
    };
}

export { HotbarPF2e };
