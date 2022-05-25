import { PhysicalItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { calculateDC } from "@module/dc";
import { CheckDC } from "@system/degree-of-success";
import { ActionMacros, SkillActionOptions } from "..";
import { CharacterPF2e } from "@actor";

interface RepairActionOptions extends SkillActionOptions {
    difficultyClass?: CheckDC;
    item?: PhysicalItemPF2e;
    uuid?: string;
}

interface ItemDropData {
    actorId?: string;
    data?: {
        _id?: string;
    };
    type: "Item";
}

class SelectItemDialog extends Application {
    private item: PhysicalItemPF2e | null = null;

    private constructor(private resolve: (value: PhysicalItemPF2e | null) => void) {
        super({
            classes: ["select-repair-item-dialog"],
            template: "systems/pf2e/templates/system/actions/repair/select-item-dialog.html",
            title: "PF2E.Actions.Repair.SelectItemDialog.Title",
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
            const json = event.originalEvent?.dataTransfer?.getData("text/plain")?.trim();
            if (!json?.startsWith("{") || !json.endsWith("}")) return;

            const data: Partial<ItemDropData> = JSON.parse(json);
            const item = await (async () => {
                if (data.type === "Item" && data.actorId && data.data?._id) {
                    return await fromUuid(`Actor.${data.actorId}.Item.${data.data._id}`);
                }
                return null;
            })();

            if (item instanceof PhysicalItemPF2e) {
                this.item = item;
                this.render();
            } else {
                ui.notifications.error(game.i18n.localize("PF2E.Actions.Repair.Error.ItemReferenceMismatch"));
            }
        });

        $html.find("[data-event-handler=repair]").on("click", () => {
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

export async function repair(options: RepairActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "crafting");

    // resolve item
    const item = options.item ?? (options.uuid ? await fromUuid(options.uuid) : await SelectItemDialog.getItem());

    // ensure specified item is a valid crafting target
    if (item && !(item instanceof PhysicalItemPF2e)) {
        ui.notifications.warn(game.i18n.format("PF2E.Actions.Repair.Warning.NotPhysicalItem", { item: item.name }));
        return;
    }

    // check that actor has the necessary repair kit to craft item?
    // verify that item is damaged but not destroyed

    // figure out DC from item
    const dc: CheckDC | undefined =
        options.difficultyClass ??
        (() => {
            if (item) {
                const proficiencyWithoutLevel =
                    game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
                return {
                    label: game.i18n.format("PF2E.Actions.Repair.Labels.ItemLevelRepairDC", { level: item.level }),
                    value: calculateDC(item.level, { proficiencyWithoutLevel }),
                    visibility: "all",
                };
            }
            return;
        })();

    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Repair.Title",
        subtitle,
        content: async (title) => {
            if (item) {
                const templatePath = "systems/pf2e/templates/system/actions/repair/item-heading-partial.html";
                const templateData = { item };
                const content = await renderTemplate(templatePath, templateData);
                return title + content;
            }
            return;
        },
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:repair"],
        extraOptions: ["action:repair"],
        traits: ["exploration", "manipulate"],
        checkType,
        event: options.event,
        difficultyClass: dc,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.Repair", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Repair", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Repair", "criticalFailure"),
        ],
        createMessage: false,
        callback: async (result) => {
            // react to check result by posting a chat message with appropriate follow-up options
            if (item && result.message instanceof ChatMessagePF2e) {
                const messageData = result.message.data;
                const flavor = await (async () => {
                    const proficiencyRank = result.actor instanceof CharacterPF2e ? result.actor.skills.cra.rank : 0;
                    if ("criticalSuccess" === result.outcome) {
                        const restored = String(10 + proficiencyRank * 10);
                        return renderRepairResult(
                            item,
                            "restore",
                            "PF2E.Actions.Repair.Labels.RestoreItemHitPoints",
                            restored
                        );
                    } else if ("success" === result.outcome) {
                        const restored = String(5 + proficiencyRank * 5);
                        return renderRepairResult(
                            item,
                            "restore",
                            "PF2E.Actions.Repair.Labels.RestoreItemHitPoints",
                            restored
                        );
                    } else if ("criticalFailure" === result.outcome) {
                        const damage = "2d6";
                        return renderRepairResult(
                            item,
                            "roll-damage",
                            "PF2E.Actions.Repair.Labels.RollItemDamage",
                            damage
                        );
                    }
                    return "";
                })();
                if (flavor) {
                    messageData.update({ flavor: messageData.flavor + flavor });
                }
                await ChatMessage.create(messageData);
            }
        },
    });
}

async function renderRepairResult(
    item: PhysicalItemPF2e,
    result: "restore" | "roll-damage",
    buttonLabel: string,
    value: string
) {
    const label = game.i18n.format(buttonLabel, { value });
    return renderTemplate("systems/pf2e/templates/system/actions/repair/repair-result-partial.html", {
        item,
        label,
        result,
        value,
    });
}
