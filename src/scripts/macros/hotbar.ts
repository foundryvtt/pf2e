import { SkillAbbreviation } from "@actor/creature/data.ts";
import { StrikeData } from "@actor/data/base.ts";
import { SKILL_DICTIONARY } from "@actor/values.ts";
import { ItemPF2e, EffectPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { MacroPF2e } from "@module/macro.ts";

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param itemId
 */
export function rollItemMacro(itemId: string): ReturnType<ItemPF2e["toChat"]> | void {
    const speaker = ChatMessage.getSpeaker();
    const actor = canvas.tokens.get(speaker.token ?? "")?.actor ?? game.actors.get(speaker.actor ?? "");
    const item = actor?.items?.get(itemId);
    if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item with ID ${itemId}`);

    // Trigger the item roll
    return item.toChat();
}

export async function createActionMacro(actionIndex: number, slot: number): Promise<void> {
    const speaker = ChatMessage.getSpeaker();
    const actor = canvas.tokens.get(speaker.token ?? "")?.actor ?? game.actors.get(speaker.actor ?? "");
    const action = actor?.isOfType("character", "npc") ? actor.system.actions[actionIndex] : null;
    if (!action) return;
    const macroName = `${game.i18n.localize("PF2E.WeaponStrikeLabel")}: ${action.label}`;
    const command = `game.pf2e.rollActionMacro("${action.item.id}", ${actionIndex}, "${action.slug}")`;
    const actionMacro =
        game.macros.find((macro) => macro.name === macroName && macro.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: macroName,
                type: "script",
                img: action.imageUrl,
                flags: { pf2e: { actionMacro: true } },
            },
            { renderSheet: false }
        ));
    game.user.assignHotbarMacro(actionMacro ?? null, slot);
}

export async function rollActionMacro(itemId: string, _actionIndex: number, actionSlug: string): Promise<void> {
    const speaker = ChatMessage.getSpeaker();
    const actor = canvas.tokens.get(speaker.token ?? "")?.actor ?? game.actors.get(speaker.actor ?? "");
    if (!actor?.isOfType("character", "npc")) {
        return ui.notifications.error("PF2E.MacroActionNoActorError", { localize: true });
    }

    const strikes: StrikeData[] = actor.system.actions;
    const strike =
        strikes.find((s) => s.item.id === itemId && s.slug === actionSlug) ??
        strikes.find((s) => s.slug === actionSlug);
    if (!strike) {
        return ui.notifications.error("PF2E.MacroActionNoActionError", { localize: true });
    }

    const templateData = {
        actor,
        strike,
        strikeIndex: strikes.indexOf(strike),
        strikeDescription: await TextEditor.enrichHTML(game.i18n.localize(strike.description), {
            async: true,
        }),
    };

    const content = await renderTemplate("systems/pf2e/templates/chat/strike-card.hbs", templateData);
    const token = actor.token ?? actor.getActiveTokens(true, true).shift() ?? null;
    const chatData: Partial<foundry.documents.ChatMessageSource> = {
        speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
        content,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        flags: {
            core: { canPopout: true },
        },
    };

    const rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode))
        chatData.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
    if (rollMode === "blindroll") chatData.blind = true;

    ChatMessagePF2e.create(chatData);
}

export async function createSkillMacro(
    skill: SkillAbbreviation,
    skillName: string,
    actorId: string,
    slot: number
): Promise<void> {
    const dictName = SKILL_DICTIONARY[skill] ?? skill;
    const command = `
const a = game.actors.get("${actorId}");
if (a) {
    const opts = a.getRollOptions(["all", "skill-check", "${dictName}"]);
    a.system.skills["${skill}"]?.roll(event, opts);
} else {
    ui.notifications.error(game.i18n.localize("PF2E.MacroActionNoActorError"));
}`;
    const macroName = game.i18n.format("PF2E.SkillCheckWithName", { skillName });
    const skillMacro =
        game.macros.find((macro) => macro.name === macroName && macro.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: macroName,
                type: "script",
                img: "icons/svg/d20-grey.svg",
                flags: { pf2e: { skillMacro: true } },
            },
            { renderSheet: false }
        ));
    game.user.assignHotbarMacro(skillMacro ?? null, slot);
}

export async function createToggleEffectMacro(effect: EffectPF2e, slot: number): Promise<void> {
    const uuid = effect.uuid.startsWith("Actor") ? effect.sourceId : effect.uuid;
    if (!uuid) {
        ui.notifications.error("PF2E.ErrorMessage.CantCreateEffectMacro", { localize: true });
        return;
    }

    const command = `
const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
if (actors.length === 0 && game.user.character) actors.push(game.user.character);
if (actors.length === 0) {
    return ui.notifications.error("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
}

const ITEM_UUID = "${uuid}"; // ${effect.name}
const source = (await fromUuid(ITEM_UUID)).toObject();
source.flags = mergeObject(source.flags ?? {}, { core: { sourceId: ITEM_UUID } });

for (const actor of actors) {
    const existing = actor.itemTypes.effect.find((e) => e.flags.core?.sourceId === ITEM_UUID);
    if (existing) {
        await existing.delete();
    } else {
        await actor.createEmbeddedDocuments("Item", [source]);
    }
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
            { renderSheet: false }
        ));
    game.user.assignHotbarMacro(toggleMacro ?? null, slot);
}
