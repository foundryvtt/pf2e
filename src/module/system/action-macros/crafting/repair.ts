import { PhysicalItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { calculateDC } from "@module/dc";
import { CheckDC } from "@system/degree-of-success";
import { ActionMacroHelpers } from "../helpers";
import { CharacterPF2e } from "@actor";
import { SkillActionOptions } from "../types";

async function repair(options: RepairActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "crafting");

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

    ActionMacroHelpers.simpleRollActionCheck({
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
            ActionMacroHelpers.note(selector, "PF2E.Actions.Repair", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Repair", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Repair", "criticalFailure"),
        ],
        createMessage: false,
        callback: async (result) => {
            // react to check result by posting a chat message with appropriate follow-up options
            if (item && result.message instanceof ChatMessagePF2e) {
                const messageData = result.message.data;
                const flavor = await (async () => {
                    const proficiencyRank = result.actor instanceof CharacterPF2e ? result.actor.skills.cra.rank : 0;
                    if ("criticalSuccess" === result.outcome) {
                        const label = "PF2E.Actions.Repair.Labels.RestoreItemHitPoints";
                        const restored = String(10 + proficiencyRank * 10);
                        return renderRepairResult(item, "restore", label, restored);
                    } else if ("success" === result.outcome) {
                        const label = "PF2E.Actions.Repair.Labels.RestoreItemHitPoints";
                        const restored = String(5 + proficiencyRank * 5);
                        return renderRepairResult(item, "restore", label, restored);
                    } else if ("criticalFailure" === result.outcome) {
                        const label = "PF2E.Actions.Repair.Labels.RollItemDamage";
                        const damage = "2d6";
                        return renderRepairResult(item, "roll-damage", label, damage);
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

async function onRepairChatCardEvent(event: JQuery.ClickEvent, message: ChatMessagePF2e | undefined, $card: JQuery) {
    const itemUuid = $card.attr("data-item-uuid");
    const item = await fromUuid(itemUuid ?? "");
    if (!(item instanceof PhysicalItemPF2e)) return;
    const $button = $(event.currentTarget);
    const repair = $button.attr("data-repair");
    const speaker =
        message &&
        ChatMessagePF2e.getSpeaker({
            actor: message.actor,
            alias: message.alias,
            token: message.token,
        });
    if (repair === "restore") {
        const value = Number($button.attr("data-repair-value") ?? "0");
        const beforeRepair = item.data.data.hp.value;
        const afterRepair = Math.min(item.data.data.hp.max, beforeRepair + value);
        await item.update({ "data.hp.value": afterRepair });
        const content = game.i18n.format("PF2E.Actions.Repair.Chat.ItemRepaired", {
            itemName: item.name,
            repairedDamage: afterRepair - beforeRepair,
            afterRepairHitPoints: afterRepair,
            maximumHitPoints: item.data.data.hp.max,
        });
        await ChatMessage.create({ content, speaker });
    } else if (repair === "roll-damage") {
        const roll = await Roll.create("2d6").evaluate({ async: true });
        const templatePath = "systems/pf2e/templates/system/actions/repair/roll-damage-chat-message.html";
        const flavor = await renderTemplate(templatePath, {
            damage: {
                dealt: Math.max(0, roll.total - item.data.data.hardness),
                rolled: roll.total,
            },
            item,
        });
        await roll.toMessage({
            flags: {
                pf2e: {
                    suppressDamageButtons: true,
                },
            },
            flavor,
            speaker,
        });
    } else if (repair === "damage") {
        const hardness = Math.max(0, item.data.data.hardness);
        const damage = (message?.roll?.total ?? 0) - hardness;
        if (damage > 0) {
            const beforeDamage = item.data.data.hp.value;
            const afterDamage = Math.max(0, item.data.data.hp.value - damage);
            await item.update({ "data.hp.value": afterDamage });
            const content = game.i18n.format("PF2E.Actions.Repair.Chat.ItemDamaged", {
                itemName: item.name,
                damageDealt: beforeDamage - afterDamage,
                afterDamageHitPoints: afterDamage,
                maximumHitPoints: item.data.data.hp.max,
            });
            await ChatMessage.create({ content, speaker });
        } else {
            const templatePath = "systems/pf2e/templates/system/actions/repair/roll-damage-chat-message.html";
            const content = await renderTemplate(templatePath, {
                damage: {
                    dealt: 0,
                    rolled: message?.roll?.total ?? 0,
                },
                item,
            });
            await ChatMessage.create({ content, speaker });
        }
    }
}

async function renderRepairResult(
    item: PhysicalItemPF2e,
    result: "restore" | "roll-damage",
    buttonLabel: string,
    value: string
) {
    const templatePath = "systems/pf2e/templates/system/actions/repair/repair-result-partial.html";
    const label = game.i18n.format(buttonLabel, { value });
    return renderTemplate(templatePath, { item, label, result, value });
}

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

export { onRepairChatCardEvent, repair };
