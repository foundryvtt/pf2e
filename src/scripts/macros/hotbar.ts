import { ItemPF2e } from "@item/base";
import { ItemSourcePF2e } from "@item/data";
import { EffectPF2e } from "@item/effect";
import { MacroPF2e } from "@module/macro";
import { ChatMessagePF2e } from "@module/chat-message";
import { SKILL_DICTIONARY } from "@actor/values";
import { SkillAbbreviation } from "@actor/creature/data";
import { LocalizePF2e } from "@system/localize";
import { StrikeData } from "@actor/data/base";

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param item     The item data
 * @param slot     The hotbar slot to use
 */
export async function createItemMacro(item: ItemSourcePF2e, slot: number): Promise<void> {
    const command = `game.pf2e.rollItemMacro("${item._id}");`;
    const macro =
        game.macros.find((macro) => macro.name === item.name && macro.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: item.name,
                type: "script",
                img: item.img,
                flags: { pf2e: { itemMacro: true } },
            },
            { renderSheet: false }
        ));
    game.user.assignHotbarMacro(macro ?? null, slot);
}

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

export async function createActionMacro(actionIndex: number, actorId: string, slot: number): Promise<void> {
    const actor = game.actors.get(actorId, { strict: true });
    const action = actor.isOfType("character", "npc") ? actor.system.actions[actionIndex] : null;
    if (!action) return;
    const macroName = `${game.i18n.localize("PF2E.WeaponStrikeLabel")}: ${action.slug}`;
    const actionName = JSON.stringify(action.slug);
    const command = `game.pf2e.rollActionMacro("${actorId}", ${actionIndex}, ${actionName})`;
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

export async function rollActionMacro(actorId: string, _actionIndex: number, actionSlug: string): Promise<void> {
    const actor = game.actors.get(actorId);
    if (!actor?.isOfType("character", "npc")) {
        return ui.notifications.error("PF2E.MacroActionNoActorError", { localize: true });
    }

    const strikes: StrikeData[] = actor.system.actions;
    const strike = strikes.find((s) => s.slug === actionSlug);
    if (strike?.slug !== actionSlug) {
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

    const content = await renderTemplate("systems/pf2e/templates/chat/strike-card.html", templateData);
    const token = actor.token ?? actor.getActiveTokens(true, true).shift() ?? null;
    const chatData: Partial<foundry.data.ChatMessageSource> = {
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

export async function createSkillMacro(skill: SkillAbbreviation, skillName: string, actorId: string, slot: number) {
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

export async function createToggleEffectMacro(effect: EffectPF2e, slot: number) {
    const uuid = effect.uuid.startsWith("Actor") ? effect.sourceId : effect.uuid;
    if (!uuid) {
        const message = LocalizePF2e.translations.PF2E.ErrorMessage.CantCreateEffectMacro;
        ui.notifications.error(game.i18n.localize(message));
        return;
    }

    const command = `
const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
if (actors.length === 0 && game.user.character) actors.push(game.user.character);
if (actors.length === 0) {
    const message = game.i18n.localize("PF2E.ErrorMessage.NoTokenSelected");
    return ui.notifications.error(message);
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
