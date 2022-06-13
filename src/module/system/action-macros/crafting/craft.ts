import { renderCraftingInline } from "@actor/character/crafting/helpers";
import { PhysicalItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { calculateDC } from "@module/dc";
import { CheckDC } from "@system/degree-of-success";
import { ActionMacroHelpers } from "../helpers";
import { SkillActionOptions } from "../types";

export async function craft(options: CraftActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "crafting");

    // resolve item
    const item = options.item ?? (options.uuid ? await fromUuid(options.uuid) : await SelectItemDialog.getItem());

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
        visibility: "all",
    };

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
                const messageData = result.message.data;
                const flavor = await (async () => {
                    if (["criticalSuccess", "success", "criticalFailure"].includes(result.outcome ?? "")) {
                        return await renderCraftingInline(item, result.roll, quantity, result.actor);
                    }
                    return "";
                })();
                if (flavor) {
                    messageData.update({ flavor: messageData.flavor + flavor });
                }
                ChatMessage.create(messageData);
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
}

interface ItemDropData {
    id?: string;
    pack?: string;
    type: "Item";
}

class SelectItemDialog extends Application {
    private item: PhysicalItemPF2e | null = null;

    private constructor(private resolve: (value: PhysicalItemPF2e | null) => void) {
        super({
            classes: ["select-craft-item-dialog"],
            template: "systems/pf2e/templates/system/actions/craft-target-item.html",
            title: "PF2E.Actions.Craft.SelectItemDialog.Title",
            width: 270,
        });
    }

    override async getData() {
        const data: { item?: PhysicalItemPF2e | null } = await super.getData();
        data.item = this.item;
        return data;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.on("drop", async (event) => {
            const json = event.originalEvent?.dataTransfer?.getData("text/plain");
            if (!json?.startsWith("{") || !json.endsWith("}")) return;

            const data: Partial<ItemDropData> = JSON.parse(json);
            const item = await (async () => {
                if (data.type === "Item" && data.pack && data.id) {
                    return await fromUuid(`Compendium.${data.pack}.${data.id}`);
                } else if (data.type === "Item" && data.id) {
                    return await fromUuid(`Item.${data.id}`);
                }
                return null;
            })();

            if (item instanceof PhysicalItemPF2e) {
                this.item = item;
                this.render();
            } else {
                ui.notifications.error(game.i18n.localize("PF2E.Actions.Craft.Error.ItemReferenceMismatch"));
            }
        });

        $html.find("[data-event-handler=craft]").on("click", () => {
            this.close();
        });

        $html.find("[data-event-handler=cancel]").on("click", () => {
            this.item = null;
            this.close();
        });
    }

    override close(options?: { force?: boolean }): Promise<void> {
        this.resolve(this.item);
        return super.close(options);
    }

    static async getItem(): Promise<PhysicalItemPF2e | null> {
        return new Promise((resolve) => {
            new SelectItemDialog(resolve).render(true);
        });
    }
}
