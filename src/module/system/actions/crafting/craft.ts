import { ActionsPF2e, SkillActionOptions } from "@system/actions/actions";
import { PhysicalItemPF2e } from "@item";
import { calculateDC } from "@module/dc";
import { CheckDC } from "@system/check-degree-of-success";
import ChatMessageData = foundry.data.ChatMessageData;
import { ActorPF2e } from "@actor";
import { renderCraftingInline } from "@module/crafting/crafting";

interface CraftActionOptions extends SkillActionOptions {
    dc?: CheckDC;
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

    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        html.on("drop", async (event) => {
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

        html.find("[data-event-handler=craft]").on("click", () => {
            this.close();
        });

        html.find("[data-event-handler=cancel]").on("click", () => {
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

export async function craft(options: CraftActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "crafting");

    // ensure single character
    if (!(options.actors instanceof ActorPF2e)) {
        return;
    }

    const actor = options.actors;

    // resolve item
    const item = await (async () => {
        return options.item ?? (options.uuid ? fromUuid(options.uuid) : null) ?? SelectItemDialog.getItem();
    })();

    // ensure item is a valid crafting target
    if (!item) {
        console.log("No item selected to craft - aborting.");
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
        visibility: "all",
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
                const flavor = await (async () => {
                    if (["criticalSuccess", "success"].includes(result.outcome ?? "")) {
                        return await renderCraftingInline(item, result.roll, quantity, actor, options.uuid || "");
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
