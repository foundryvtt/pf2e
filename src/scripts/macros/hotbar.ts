import { ActorPF2e } from "@actor";
import { AttackPopout } from "@actor/character/apps/attack-popout.ts";
import { ElementalBlast } from "@actor/character/elemental-blast.ts";
import type { ActorUUID } from "@client/documents/_module.d.mts";
import type { ImageFilePath } from "@common/constants.d.mts";
import { ItemPF2e, type ConditionPF2e, type EffectPF2e } from "@item";
import { EffectTrait } from "@item/abstract-effect/types.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { createUseActionMessage } from "@module/chat-message/helpers.ts";
import { MacroPF2e } from "@module/macro.ts";
import { eventToRollMode } from "@module/sheet/helpers.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { objectHasKey } from "@util";
import { UUIDUtils } from "@util/uuid.ts";

/** Given an item's id or uuid, retrieves the item and uses it.  */
export async function rollItemMacro(itemIdOrUuid: string, event: Event | null = null): Promise<ChatMessagePF2e | null> {
    const speaker = ChatMessage.getSpeaker();
    const item = await (async () => {
        if (UUIDUtils.isItemUUID(itemIdOrUuid)) {
            const item = await fromUuid(itemIdOrUuid);
            if (item instanceof ItemPF2e && item.actor) {
                return item;
            } else {
                ui.notifications.warn(`Item with uuid ${itemIdOrUuid} does not exist`);
                return null;
            }
        }

        const actor = canvas.tokens.get(speaker.token ?? "")?.actor ?? game.actors.get(speaker.actor ?? "");
        const item = actor?.items?.get(itemIdOrUuid);
        if (!item) {
            ui.notifications.warn(`Your controlled Actor does not have an item with ID ${itemIdOrUuid}`);
            return null;
        }

        return item;
    })();

    if (!item) return null;

    if (item.isOfType("action", "feat")) {
        return createUseActionMessage(item, eventToRollMode(event));
    }

    // Trigger the item roll
    return (await item.toMessage(event)) ?? null;
}

export async function createActionMacro({
    actorUUID,
    actionIndex,
    elementTrait,
    slot,
}: {
    actorUUID?: ActorUUID;
    elementTrait?: string;
    actionIndex?: number;
    slot: number;
}): Promise<void> {
    const actor = resolveMacroActor(actorUUID);
    if (!actor?.isOfType("character", "npc")) return;

    const data = ((): { name: string; command: string; img: ImageFilePath } | null => {
        if (actor.isOfType("character") && objectHasKey(CONFIG.PF2E.effectTraits, elementTrait)) {
            const blast = new ElementalBlast(actor);
            const config = blast.configs.find((c) => c.element === elementTrait);
            if (!config) return null;
            return {
                name: game.i18n.localize(config.label),
                command: `game.pf2e.rollActionMacro({ actorUUID: "${actorUUID}", type: "blast", elementTrait: "${elementTrait}" })`,
                img: config.img,
            };
        } else if (actionIndex !== undefined) {
            const action = actor.system.actions[actionIndex];
            if (!action) return null;
            const actionName = game.i18n.localize(
                action.type === "strike" ? "PF2E.WeaponStrikeLabel" : action.attackRollType,
            );
            return {
                name: `${actionName}: ${action.label}`,
                command: `game.pf2e.rollActionMacro({ actorUUID: "${actorUUID}",  type: "${action.type}", itemId: "${action.item.id}", slug: "${action.slug}" })`,
                img: action.item.img,
            };
        }
        return null;
    })();
    if (!data) return;

    const actionMacro =
        game.macros.find((macro) => macro.name === data.name && macro.command === data.command) ??
        (await MacroPF2e.create(
            {
                command: data.command,
                name: data.name,
                type: "script",
                img: data.img,
                flags: { pf2e: { actionMacro: true } },
            },
            { renderSheet: false },
        ));
    game.user.assignHotbarMacro(actionMacro ?? null, slot);
}

export async function rollActionMacro({
    actorUUID,
    itemId,
    elementTrait,
    slug,
    type,
}: RollActionMacroParams): Promise<ChatMessagePF2e | undefined> {
    const actor = resolveMacroActor(actorUUID);
    if (!actor?.isOfType("character", "npc")) {
        ui.notifications.error("PF2E.MacroActionNoActorError", { localize: true });
        return;
    }

    const strikes = actor.system.actions;
    const strike = strikes.find((s) => s.item.id === itemId && s.slug === slug) ?? strikes.find((s) => s.slug === slug);

    // For characters show an AttackPopout
    if (actor.isOfType("character")) {
        // If the app is already rendered, close it
        const closedExisting = (partialId: string): boolean => {
            const appId = `AttackPopout-Actor-${actor.id}-${partialId}`;
            const existing = Object.values(actor.apps).find((a) => a?.id === appId);
            if (existing) {
                existing.close({ force: true });
                return true;
            }
            return false;
        };

        switch (type) {
            case "blast": {
                if (closedExisting(`blast-${elementTrait}`)) return;
                const auraActive = actor.itemTypes.effect.find((e) => e.slug === "effect-kinetic-aura");
                if (!auraActive) {
                    ui.notifications.error("PF2E.MacroActionNoActionError", { localize: true });
                    return;
                }

                new AttackPopout(actor, { type, elementTrait }).render(true);
                return;
            }
            case "strike":
            case "area-fire":
            case "auto-fire": {
                if (closedExisting(`${type}-${itemId}-${slug}`)) return;
                if (!strike) {
                    ui.notifications.error("PF2E.MacroActionNoActionError", { localize: true });
                    return;
                }

                new AttackPopout(actor, { type, itemId, slug }).render(true);
                return;
            }
        }
    }

    // For other actors show a chat card
    if (!strike) {
        ui.notifications.error("PF2E.MacroActionNoActionError", { localize: true });
        return;
    }

    const meleeOrRanged = strike.item.isMelee ? "melee" : "ranged";
    const identifier = `${strike.item.id}.${strike.slug}.${meleeOrRanged}`;
    const description = await TextEditorPF2e.enrichHTML(game.i18n.localize(strike.description));

    const templateData = { actor, strike, identifier, description };

    const content = await fa.handlebars.renderTemplate("systems/pf2e/templates/chat/strike-card.hbs", templateData);
    const token = actor.token ?? actor.getActiveTokens(true, true).shift() ?? null;
    const chatData: DeepPartial<foundry.documents.ChatMessageSource> = {
        speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
        content,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    };

    const rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode))
        chatData.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
    if (rollMode === "blindroll") chatData.blind = true;

    return ChatMessagePF2e.create(chatData);
}

export async function createToggleEffectMacro(effect: ConditionPF2e | EffectPF2e, slot: number): Promise<void> {
    const uuid = effect.uuid.startsWith("Actor") ? effect.sourceId : effect.uuid;
    if (!uuid) {
        ui.notifications.error("PF2E.ErrorMessage.CantCreateEffectMacro", { localize: true });
        return;
    }

    const command = `const actors = game.user.getActiveTokens().flatMap((t) => t.actor ?? []);
if (actors.length === 0) {
    return ui.notifications.error("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
}

const ITEM_UUID = "${uuid}"; // ${effect.name}
const item = await fromUuid(ITEM_UUID);
if (item?.type === "condition") {
    for (const actor of actors) {
        actor.toggleCondition(item.slug);
    }
} else if (item?.type === "effect") {
    const source = item.toObject();
    source._stats.compendiumSource = ITEM_UUID;

    for (const actor of actors) {
        const existing = actor.itemTypes.effect.find((e) => e._stats.compendiumSource === ITEM_UUID);
        if (existing) {
            existing.delete();
        } else {
            actor.createEmbeddedDocuments("Item", [source]);
        }
    }
} else {
    ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.ItemNotFoundByUUID", { uuid: ITEM_UUID }));
}
`;
    const toggleMacro =
        game.macros.contents.find((macro) => macro.name === effect.name && macro.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: effect.name,
                type: "script",
                img: effect.img,
            },
            { renderSheet: false },
        ));
    game.user.assignHotbarMacro(toggleMacro ?? null, slot);
}

function resolveMacroActor(uuid?: ActorUUID): ActorPF2e | null {
    if (uuid) {
        const actor = fromUuidSync(uuid);
        return actor instanceof ActorPF2e ? actor : null;
    }
    const speaker = ChatMessage.getSpeaker();
    return canvas.tokens.get(speaker.token ?? "")?.actor ?? game.actors.get(speaker.actor ?? "") ?? null;
}

interface RollActionMacroParams {
    actorUUID?: ActorUUID;
    itemId?: string;
    slug?: string;
    elementTrait?: EffectTrait;
    type?: "blast" | "strike" | "area-fire" | "auto-fire";
}
