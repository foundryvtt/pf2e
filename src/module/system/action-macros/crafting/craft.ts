import { renderCraftingInline } from "@actor/character/crafting/helpers";
import { PhysicalItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { calculateDC } from "@module/dc";
import { CheckDC } from "@system/degree-of-success";
import { ActionMacroHelpers } from "../helpers";
import { SkillActionOptions } from "../types";
import { SelectItemDialog } from "./select-item";

export async function craft(options: CraftActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "crafting");

    // resolve item
    const item =
        options.item ?? (options.uuid ? await fromUuid(options.uuid) : await SelectItemDialog.getItem("craft"));

    // ensure item is a valid crafting target
    if (!item) {
        console.warn("PF2e System | No item selected to craft: aborting");
        return;
    } else if (!(item instanceof PhysicalItemPF2e)) {
        ui.notifications.warn(game.i18n.format("PF2E.Actions.Craft.Warning.NotPhysicalItem", { item: item.name }));
        return;
    }

    // check for sufficient proficiency in crafting skill
    // check that actor has the necessary feats to craft item

    const quantity = options.quantity ?? 1;

    // figure out DC from item
    const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
    const dc: CheckDC = options.difficultyClass ?? {
        value: calculateDC(item.level, { proficiencyWithoutLevel }),
        visible: true,
    };

    // whether the player needs to pay crafting costs
    const free = !!options.free;

    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Craft.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:craft"],
        extraOptions: ["action:craft"],
        traits: ["downtime", "manipulate"],
        checkType,
        event: options.event,
        difficultyClass: dc,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Craft", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Craft", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Craft", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Craft", "criticalFailure"),
        ],
        createMessage: false,
        callback: async (result) => {
            // react to check result, creating the item in the actor's inventory on a success
            if (result.message instanceof ChatMessagePF2e) {
                const message = result.message;
                const flavor = await (async () => {
                    if (["criticalSuccess", "success", "criticalFailure"].includes(result.outcome ?? "")) {
                        return await renderCraftingInline(item, result.roll, quantity, result.actor, free);
                    }
                    return "";
                })();
                if (flavor) {
                    message.updateSource({ flavor: message.flavor + flavor });
                }
                ChatMessage.create(message.toObject());
            } else {
                console.error("PF2E | Unable to amend chat message with craft result.", result.message);
            }
            options.callback?.(result);
        },
    });
}

interface CraftActionOptions extends SkillActionOptions {
    difficultyClass?: CheckDC;
    item?: PhysicalItemPF2e;
    quantity?: number;
    uuid?: string;
    free?: boolean;
}
