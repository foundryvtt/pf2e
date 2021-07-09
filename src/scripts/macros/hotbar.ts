import { ItemPF2e } from '@item/base';
import { ItemDataPF2e } from '@item/data';
import { EffectPF2e } from '@item/effect';
import { MacroPF2e } from '@module/macro';
import { ChatMessagePF2e } from '@module/chat-message';
import { SKILL_DICTIONARY } from '@actor/data/values';
import { SkillAbbreviation } from '@actor/creature/data';

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param item     The item data
 * @param slot     The hotbar slot to use
 */
export async function createItemMacro(item: ItemDataPF2e, slot: number): Promise<void> {
    const command = `game.pf2e.rollItemMacro("${item._id}");`;
    const macro =
        game.macros.find((macro) => macro.name === item.name && macro.data.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: item.name,
                type: 'script',
                img: item.img,
                flags: { 'pf2e.itemMacro': true },
            },
            { renderSheet: false },
        ));
    game.user.assignHotbarMacro(macro ?? null, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param itemId
 */
export function rollItemMacro(itemId: string): ReturnType<ItemPF2e['toChat']> | void {
    const speaker = ChatMessage.getSpeaker();
    const actor = canvas.tokens.get(speaker.token ?? '')?.actor ?? game.actors.get(speaker.actor ?? '');
    const item = actor?.items?.get(itemId);
    if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item with ID ${itemId}`);

    // Trigger the item roll
    return item.toChat();
}

export async function createActionMacro(actionIndex: string, actorId: string, slot: number): Promise<void> {
    const actor = game.actors.get(actorId);
    const action = (actor as any).data.data.actions[actionIndex];
    const macroName = `${game.i18n.localize('PF2E.WeaponStrikeLabel')}: ${action.name}`;
    const actionName = JSON.stringify(action.name);
    const command = `game.pf2e.rollActionMacro('${actorId}', ${actionIndex}, ${actionName})`;
    const actionMacro =
        game.macros.find((macro) => macro.name === macroName && macro.data.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: macroName,
                type: 'script',
                img: action.imageUrl,
                flags: { 'pf2e.actionMacro': true },
            },
            { renderSheet: false },
        ));
    game.user.assignHotbarMacro(actionMacro ?? null, slot);
}

export async function rollActionMacro(actorId: string, actionIndex: number, actionName: string) {
    const actor = game.actors.get(actorId);
    if (actor) {
        const action = (actor as any).data.data.actions[actionIndex];
        if (action && action.name === actionName) {
            if (action.type === 'strike') {
                const templateData = {
                    actor,
                    strike: action,
                    strikeIndex: actionIndex,
                    strikeDescription: TextEditor.enrichHTML(game.i18n.localize(action.description)),
                };

                const messageContent = await renderTemplate(
                    'systems/pf2e/templates/chat/strike-card.html',
                    templateData,
                );
                const chatData: Partial<foundry.data.ChatMessageSource> = {
                    user: game.user.id,
                    speaker: {
                        actor: actor.id,
                        token: actor.token?.id,
                        alias: actor.name,
                    },
                    content: messageContent,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    flags: {
                        core: {
                            canPopout: true,
                        },
                    },
                };

                const rollMode = game.settings.get('core', 'rollMode');
                if (['gmroll', 'blindroll'].includes(rollMode))
                    chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u.id);
                if (rollMode === 'blindroll') chatData.blind = true;

                ChatMessagePF2e.create(chatData);
            }
        } else {
            ui.notifications.error(game.i18n.localize('PF2E.MacroActionNoActionError'));
        }
    } else {
        ui.notifications.error(game.i18n.localize('PF2E.MacroActionNoActorError'));
    }
}

export async function createSkillMacro(skill: SkillAbbreviation, skillName: string, actorId: string, slot: number) {
    const dictName = SKILL_DICTIONARY[skill] ?? skill;
    const command = `
const a = game.actors.get('${actorId}');
if (a) {
    const opts = a.getRollOptions(['all', 'skill-check', '${dictName}']);
    a.data.data.skills['${skill}']?.roll(event, opts);
} else {
    ui.notifications.error(game.i18n.localize('PF2E.MacroActionNoActorError'));
}`;
    const macroName = game.i18n.format('PF2E.SkillCheckWithName', { skillName });
    const skillMacro =
        game.macros.find((macro) => macro.name === macroName && macro.data.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: macroName,
                type: 'script',
                img: 'icons/svg/d20-grey.svg',
                flags: { 'pf2e.skillMacro': true },
            },
            { renderSheet: false },
        ));
    game.user.assignHotbarMacro(skillMacro ?? null, slot);
}

export async function createTogglePropertyMacro(property: string, label: string, actorId: string, slot: number) {
    const command = `const a = game.actors.get('${actorId}');
if (a) {
    const value = getProperty(a, 'data.${property}');
    a.update({'${property}': !value});
} else {
    ui.notifications.error(game.i18n.localize('PF2E.MacroActionNoActorError'));
}`;
    const macroName = game.i18n.format('PF2E.ToggleWithName', { property: label });
    const toggleMacro =
        game.macros.find((macro) => macro.name === macroName && macro.data.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: macroName,
                type: 'script',
                img: 'icons/svg/d20-grey.svg',
                flags: { 'pf2e.skillMacro': true },
            },
            { renderSheet: false },
        ));
    game.user.assignHotbarMacro(toggleMacro ?? null, slot);
}

export async function createToggleEffectMacro(pack: string, effect: EffectPF2e, slot: number) {
    const prefix = pack ? `Compendium.${pack}` : 'Item';
    const command = `
let actors = [game.user.character]
const actors = canvas.tokens.controlled.map(token => token.actor);
if (game.user.character) {
  actors.push(game.user.character);
}
const ITEM_UUID = '${prefix}.${effect.id}'; // ${effect.data.name}
(async () => {
  const effect = duplicate(await fromUuid(ITEM_UUID));
  effect.flags.core = effect.flags.core ?? {};
  effect.flags.core.sourceId = ITEM_UUID;
  for await (actor of actors) {
    const existing = actor.items.find(i => i.type === 'effect' && i.data.flags.core?.sourceId === ITEM_UUID);
    if (existing) {
      existing.delete();
    } else {
      Item.create(effect, { parent: actor });
    }
  }
})();
`;
    const toggleMacro =
        game.macros.contents.find((macro) => macro.name === effect.data.name && macro.data.command === command) ??
        (await MacroPF2e.create(
            {
                command,
                name: effect.data.name,
                type: 'script',
                img: effect.data.img,
            },
            { renderSheet: false },
        ));
    game.user.assignHotbarMacro(toggleMacro ?? null, slot);
}
