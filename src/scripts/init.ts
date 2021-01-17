/* global game, canvas, BaseGrid, SquareGrid  */
import { PF2EActor, SKILL_DICTIONARY } from '../module/actor/actor';
import { PF2EItem } from '../module/item/item';

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param item     The item data
 * @param slot     The hotbar slot to use
 */
async function createItemMacro(item: PF2EItem, slot: number): Promise<void> {
    const command = `game.pf2e.rollItemMacro("${item._id}");`;
    let macro = game.macros.entities.find((m) => m.name === item.name && m.data.command === command);
    if (!macro) {
        macro = (await Macro.create(
            {
                command,
                name: item.name,
                type: 'script',
                img: item.img,
                flags: { 'pf2e.itemMacro': true },
            },
            { displaySheet: false },
        )) as Macro;
    }
    game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param itemName
 */
export function rollItemMacro(itemId: string): ReturnType<PF2EItem['roll']> | void {
    const speaker = ChatMessage.getSpeaker();
    let actor: PF2EActor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    const item = actor ? actor.items.find((i) => i._id === itemId) : null;
    if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item with ID ${itemId}`);

    // Trigger the item roll
    return item.roll();
}

async function createActionMacro(actionIndex: string, actorId: string, slot: number): Promise<void> {
    const actor = game.actors.get(actorId);
    const action = (actor as any).data.data.actions[actionIndex];
    const macroName = `${game.i18n.localize('PF2E.WeaponStrikeLabel')}: ${action.name}`;
    const command = `game.pf2e.rollActionMacro('${actorId}', ${actionIndex}, '${action.name}')`;
    let macro = game.macros.entities.find((m) => m.name === macroName && m.data.command === command);
    if (!macro) {
        macro = await Macro.create(
            {
                command,
                name: macroName,
                type: 'script',
                img: action.imageUrl,
                flags: { 'pf2e.actionMacro': true },
            },
            { displaySheet: false },
        );
    }
    game.user.assignHotbarMacro(macro, slot);
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
                const chatData: any = {
                    user: game.user._id,
                    speaker: {
                        actor: actor._id,
                        token: actor.token,
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
                    chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u._id);
                if (rollMode === 'blindroll') chatData.blind = true;

                ChatMessage.create(chatData, {});
            }
        } else {
            ui.notifications.error(game.i18n.localize('PF2E.MacroActionNoActionError'));
        }
    } else {
        ui.notifications.error(game.i18n.localize('PF2E.MacroActionNoActorError'));
    }
}

async function createSkillMacro(skill: string, skillName: string, actorId: string, slot: number) {
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
    let macro = game.macros.entities.find((m) => m.name === macroName && m.data.command === command);
    if (!macro) {
        macro = (await Macro.create(
            {
                command,
                name: macroName,
                type: 'script',
                img: 'icons/svg/d20-grey.svg',
                flags: { 'pf2e.skillMacro': true },
            },
            { displaySheet: false },
        )) as Macro;
    }
    game.user.assignHotbarMacro(macro, slot);
}

async function createToggleMacro(property: string, label: string, actorId: string, slot: number) {
    const command = `const a = game.actors.get('${actorId}');
if (a) {
    const value = getProperty(a, 'data.${property}');
    a.update({'${property}': !value});
} else {
    ui.notifications.error(game.i18n.localize('PF2E.MacroActionNoActorError'));
}`;
    const macroName = game.i18n.format('PF2E.ToggleWithName', { property: label });
    let macro = game.macros.entities.find((m) => m.name === macroName && m.data.command === command);
    if (!macro) {
        macro = (await Macro.create(
            {
                command,
                name: macroName,
                type: 'script',
                img: 'icons/svg/d20-grey.svg',
                flags: { 'pf2e.skillMacro': true },
            },
            {},
        )) as Macro;
    }
    game.user.assignHotbarMacro(macro, slot);
}

/**
 * Activate certain behaviors on FVTT ready hook
 */
Hooks.once('init', () => {
    game.pf2e = {
        rollItemMacro,
        rollActionMacro,
    };
});

/**
 * Activate certain behaviors on Canvas Initialization hook (thanks for MooMan for this snippet)
 */
Hooks.on('canvasInit', async () => {
    /**
     * Double every other diagonal movement
     */
    SquareGrid.prototype.measureDistances = function measureDistances(
        segments: Segment[],
        options: MeasureDistancesOptions,
    ) {
        if (!options.gridSpaces) return BaseGrid.prototype.measureDistances.call(this, segments, options);

        // Track the total number of diagonals
        let nDiagonal = 0;
        const d = canvas.dimensions;

        // Iterate over measured segments
        return segments.map((s) => {
            const r = s.ray;

            // Determine the total distance traveled
            const nx = Math.abs(Math.ceil(r.dx / d.size));
            const ny = Math.abs(Math.ceil(r.dy / d.size));

            // Determine the number of straight and diagonal moves
            const nd = Math.min(nx, ny);
            const ns = Math.abs(ny - nx);
            nDiagonal += nd;

            const nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
            const spaces = nd10 * 2 + (nd - nd10) + ns;
            return spaces * canvas.dimensions.distance;
        });
    };

    // Monkey-patch Token class to fix Foundry bug causing incorrect border colors based on token disposition
    Token.prototype._getBorderColor = function (this: Token) {
        const colors = CONFIG.Canvas.dispositionColors;
        if (this._controlled) return colors.CONTROLLED;
        else if (this._hover) {
            const disposition =
                typeof this.data.disposition === 'string' ? parseInt(this.data.disposition, 10) : this.data.disposition;
            if (!game.user.isGM && this.owner) return colors.CONTROLLED;
            else if (this.actor?.hasPlayerOwner) return colors.PARTY;
            else if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return colors.FRIENDLY;
            else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) return colors.NEUTRAL;
            else return colors.HOSTILE;
        } else return null;
    };
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

Hooks.on('hotbarDrop', (bar, data, slot) => {
    if (data.type === 'Item') {
        createItemMacro(data.data, slot);
        return false;
    } else if (data.type === 'Action') {
        createActionMacro(data.index, data.actorId, slot);
        return false;
    } else if (data.type === 'Skill') {
        createSkillMacro(data.skill, data.skillName, data.actorId, slot);
    } else if (data.type === 'Toggle') {
        createToggleMacro(data.property, data.label, data.actorId, slot);
    }

    return true;
});
