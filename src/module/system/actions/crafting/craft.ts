import { ActionsPF2e, SkillActionOptions } from "@system/actions/actions";
import { PhysicalItemPF2e } from "@item";
import { calculateDC } from "@module/dc";
import { CheckDC } from "@system/check-degree-of-success";
import ChatMessageData = foundry.data.ChatMessageData;

interface CraftActionOptions extends SkillActionOptions {
    dc?: CheckDC;
    item?: PhysicalItemPF2e;
    quantity?: number;
    uuid?: string;
}

export async function craft(options: CraftActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "crafting");

    // resolve item
    const item = await (async () => {
        return options.item ?? (options.uuid ? fromUuid(options.uuid) : null) ?? null; // show dialog to support drag and drop items
    })();

    // ensure item is a valid crafting target
    if (!item) {
        ui.notifications.warn(
            game.i18n.format("PF2E.Actions.Craft.Warning.MissingItem", { uuid: options.uuid ?? null })
        );
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
    const dc: CheckDC = options.dc ?? {
        value: calculateDC(item.level, { proficiencyWithoutLevel }),
    };

    ActionsPF2e.simpleRollActionCheck({
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
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Craft", "criticalFailure"),
        ],
        createMessage: false,
        callback: async (result) => {
            // react to check result, creating the item in the actor's inventory on a success
            if (result.message instanceof ChatMessageData) {
                const link = "@" + item.uuid.replace(".", "[") + "]";
                const flavor = await (async () => {
                    if (["criticalSuccess", "success"].includes(result.outcome ?? "")) {
                        return `
                            <div style="display: flex; align-items: center; padding-bottom: 3px;">
                              <img src="${item.img}" style="height:32px; width:32px; margin-right: 3px;">
                              <span>${quantity} &times; ${TextEditor.enrichHTML(link)}</span>
                            </div>
                            <div style="padding-bottom: 3px;">
                              <button type="button">Pay to get item</button>
                            </div>
                        `; // replace this with a call to renderTemplate()
                    } else {
                        return "";
                    }
                })();
                if (flavor) {
                    result.message.update({ flavor: result.message.flavor + flavor });
                }
                ChatMessage.create(result.message);
            } else {
                console.error("PF2E | Unable to amend chat message with craft result.", result.message);
            }
        },
    });
}
