import { SKILL_ABBREVIATIONS } from "@actor/data/values";
import { EffectPF2e, ItemPF2e } from "@item";
import { MacroPF2e } from "@module/macro";
import { createActionMacro, createItemMacro, createSkillMacro, createToggleEffectMacro } from "@scripts/macros/hotbar";
import { isObject, setHasElement } from "@util";

class HotbarPF2e extends Hotbar<MacroPF2e> {
    /** Handle macro creation from non-macros */
    override async _onDrop(event: ElementDragEvent): Promise<void> {
        const li = event.target.closest<HTMLElement>(".macro");
        const slot = Number(li?.dataset.slot) || null;
        if (!slot) return;

        const data: HotbarDropData = TextEditor.getDragEventData(event);
        if (data.type === "Macro") return super._onDrop(event);
        if (Hooks.call("hotbarDrop", this, data, slot) === false) return;

        if (data.type === "Item") {
            const itemId = data.id ?? (isObject<{ _id?: unknown }>(data.data) ? data.data._id : null);

            const prefix =
                typeof data.pack === "string"
                    ? `Compendium.${data.pack}`
                    : typeof data.actorId === "string"
                    ? `Actor.${data.actorId}.Item`
                    : "Item";
            const item = await fromUuid(`${prefix}.${itemId}`);

            if (item instanceof EffectPF2e) {
                return createToggleEffectMacro(item, slot);
            } else if (item instanceof ItemPF2e) {
                return createItemMacro(item.toObject(), slot);
            }
        } else if (data.type === "RollOption" && this.hasRollOptionData(data)) {
            return this.createRollOptionToggleMacro(data, slot);
        } else if (data.type === "Skill" && data.actorId && setHasElement(SKILL_ABBREVIATIONS, data.skill)) {
            const skillName = data.skillName ?? game.i18n.localize(CONFIG.PF2E.skills[data.skill]);
            return createSkillMacro(data.skill, skillName, data.actorId, slot);
        } else if (isObject(data.pf2e) && data.actorId) {
            if (data.pf2e.type === "Action" && typeof data.pf2e.index === "number") {
                return createActionMacro(data.pf2e.index, data.actorId, slot);
            }
        }
    }

    private hasRollOptionData(data: Record<string, unknown>): data is RollOptionData {
        const { label, actorId, itemId, img, domain, option } = data;
        return (
            typeof label === "string" &&
            label.length > 0 &&
            typeof actorId === "string" &&
            actorId.length === 16 &&
            typeof img === "string" &&
            img.length > 0 &&
            typeof domain === "string" &&
            domain.length > 0 &&
            typeof option === "string" &&
            option.length > 0 &&
            (!("itemId" in data) || (typeof itemId === "string" && itemId.length === 16))
        );
    }

    private async createRollOptionToggleMacro(data: RollOptionData, slot: number): Promise<void> {
        const name = game.i18n.format("PF2E.ToggleWithName", { property: data.label });
        const img = data.img ?? "icons/svg/d20-grey.svg";

        const itemId = data.itemId ? `"${data.itemId}"` : null;
        const command = `const actor = game.actors.get("${data.actorId}");
await actor?.toggleRollOption("${data.domain}", "${data.option}", ${itemId});
if (!actor) {
    ui.notifications.error(game.i18n.localize("PF2E.MacroActionNoActorError"));
}`;

        const toggleMacro =
            game.macros.find((m) => m.name === name && m.data.command === command) ??
            (await MacroPF2e.create({ type: "script", name, img, command }, { renderSheet: false })) ??
            null;

        await game.user.assignHotbarMacro(toggleMacro, slot);
    }
}

type HotbarDropData = Partial<DropCanvasData> & {
    pack?: string;
    actorId?: string;
    slot?: number;
    skill?: string;
    skillName?: string;
    pf2e?: {
        type: string;
        property: string;
        index?: number;
        label: string;
    };
};

type RollOptionData = {
    label: string;
    actorId: string;
    itemId: string;
    img?: ImagePath;
    domain: string;
    option: string;
};

export { HotbarPF2e };
