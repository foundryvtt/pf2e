import type { ActorUUID } from "@client/documents/_module.d.mts";
import type { DropCanvasData } from "@client/helpers/hooks.d.mts";
import { ItemPF2e } from "@item";
import { MacroPF2e } from "@module/macro.ts";
import { createActionMacro, createToggleEffectMacro } from "@scripts/macros/hotbar.ts";
import { ErrorPF2e } from "@util";
import * as R from "remeda";

export class HotbarDrop {
    static listen(): void {
        Hooks.on("hotbarDrop", (_hotbar: fa.ui.Hotbar<Macro>, data: HotbarDropData, slot): false | void => {
            // A melee item dropped on the hotbar is to instead generate an action macro
            if (data.type === "Item" && data.itemType === "melee" && typeof data.index === "number") {
                data.type = "Action";
            }

            if (typeof data.type === "string" && ["Action", "Item", "RollOption"].includes(data.type)) {
                HotbarDrop.#processHotbarDrop(data, Number(slot));
                return false;
            }
        });
    }

    static async #processHotbarDrop(data: HotbarDropData, slot: number) {
        switch (data.type) {
            case "Item": {
                const itemId = data.id ?? (R.isPlainObject(data.data) ? data.data._id : null);
                const uuid = data.uuid;

                const prefix =
                    typeof data.pack === "string"
                        ? `Compendium.${data.pack}`
                        : typeof data.actorId === "string"
                          ? `Actor.${data.actorId}.Item`
                          : "Item";
                const item = await fromUuid(uuid ?? `${prefix}.${itemId}`);
                if (!(item instanceof ItemPF2e)) return;

                if (item.isOfType("condition", "effect")) {
                    return createToggleEffectMacro(item, slot);
                } else if (uuid?.startsWith("Compendium.")) {
                    ui.notifications.error("PF2E.Macro.NoCompendiumItem", { localize: true });
                    return;
                } else {
                    return HotbarDrop.#createItemMacro(item, slot);
                }
            }
            case "RollOption": {
                const item = fromUuidSync(data.uuid ?? "");
                if (!(item instanceof ItemPF2e && item.isEmbedded)) {
                    throw ErrorPF2e("Unexpected error during macro creation");
                }
                if (!this.#hasRollOptionData(data)) return;
                return HotbarDrop.#createRollOptionToggleMacro({ ...data, item }, slot);
            }
            case "Action": {
                if (typeof data.index !== "number" && !data.elementTrait) return;
                return createActionMacro({
                    actorUUID: data.actorUUID,
                    actionIndex: data.index,
                    slot,
                    elementTrait: data.elementTrait,
                });
            }
        }
    }

    static #hasRollOptionData(data: Record<string, unknown>): data is RollOptionData {
        const { label, domain, option } = data;
        return (
            typeof label === "string" &&
            label.length > 0 &&
            typeof domain === "string" &&
            domain.length > 0 &&
            typeof option === "string" &&
            option.length > 0
        );
    }

    /**
     * Create a Macro from an Item drop.
     * Get an existing item macro if one exists, otherwise create a new one.
     * @param item     The item data
     * @param slot     The hotbar slot to use
     */
    static async #createItemMacro(item: ItemPF2e, slot: number): Promise<void> {
        const isLinked = !!item.actor?.prototypeToken.actorLink;
        const command = `game.pf2e.rollItemMacro("${isLinked ? item.uuid : item.id}", event);`;
        const macro =
            game.macros.find((m) => m.name === item.name && m.command === command) ??
            (await MacroPF2e.create(
                {
                    command,
                    name: item.name,
                    type: "script",
                    img: item.img,
                    flags: { [SYSTEM_ID]: { itemMacro: true } },
                },
                { renderSheet: false },
            ));
        game.user.assignHotbarMacro(macro ?? null, slot);
    }

    static async #createRollOptionToggleMacro(
        data: Pick<RollOptionData, "label" | "domain" | "option"> & { item: ItemPF2e },
        slot: number,
    ): Promise<void> {
        const name = game.i18n.format("PF2E.ToggleWithName", { property: data.label });
        const escapedName = new Handlebars.SafeString(data.label);
        const { item, domain, option } = data;
        const command = `const item = fromUuidSync("${item.uuid}");
if (!(item instanceof Item && item.isEmbedded && item.isOwner)) {
ui.notifications.error("PF2E.MacroActionNoActorError", { localize: true });
}
const result = await item.actor.toggleRollOption("${domain}", "${option}", "${item.id}");
const state = game.i18n.localize(result ? "PF2E.Macro.OptionToggle.On" : "PF2E.Macro.OptionToggle.Off");
const message = game.i18n.format("PF2E.Macro.OptionToggle.Notification", { toggle: "${escapedName}", state });
if (typeof result === "boolean") {
ui.notifications.info(message);
}`;

        const toggleMacro =
            game.macros.find((m) => m.name === name && m.command === command) ??
            (await MacroPF2e.create({ type: "script", name, img: item.img, command }, { renderSheet: false })) ??
            null;

        await game.user.assignHotbarMacro(toggleMacro, slot);
    }
}

type HotbarDropData = Partial<DropCanvasData> & {
    actorId?: string;
    actorUUID?: ActorUUID;
    slot?: number;
    skill?: string;
    skillName?: string;
    index?: number;
    itemType?: string;
    elementTrait?: string;
    pf2e?: {
        type: string;
        property: string;
        label: string;
    };
};

type RollOptionData = {
    label: string;
    domain: string;
    option: string;
};
