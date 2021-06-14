import { ActorPF2e } from '../module/actor/base';

/**
 * @category Other
 */
export class DicePF2e {
    _rolled?: boolean;
    terms?: string[];
    _formula: any;
    /**
     * A standardized helper function for managing core PF2e "d20 rolls"
     *
     * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
     * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
     *
     * @param event         The triggering event which initiated the roll
     * @param parts         The dice roll component parts, excluding the initial d20
     * @param actor         The Actor making the d20 roll
     * @param data          Actor or item data against which to parse the roll
     * @param template      The HTML template used to render the roll dialog
     * @param title         The dice roll UI window title
     * @param speaker       The ChatMessage speaker to pass when creating the chat
     * @param flavor        A callable function for determining the chat message flavor given parts and data
     * @param advantage     Allow rolling with advantage (and therefore also with disadvantage)
     * @param situational   Allow for an arbitrary situational bonus field
     * @param fastForward   Allow fast-forward advantage selection
     * @param onClose       Callback for actions to take when the dialog form is closed
     * @param dialogOptions Modal dialog options
     */
    static async d20Roll({
        event,
        parts,
        data,
        template,
        title,
        speaker,
        flavor,
        onClose,
        dialogOptions,
        rollMode,
        rollType = '',
    }: {
        event: JQuery.Event;
        parts: any[];
        actor?: ActorPF2e;
        data: any;
        template?: string;
        title: string;
        speaker: foundry.data.ChatSpeakerSource;
        flavor?: any;
        onClose?: any;
        dialogOptions?: object;
        rollMode?: RollMode;
        rollType?: string;
    }) {
        // Inner roll function
        rollMode = rollMode || game.settings.get('core', 'rollMode');
        const userSettingQuickD20Roll = !game.user.getFlag('pf2e', 'settings.showRollDialogs');
        const _roll = (rollParts: any, adv: number, form?: any) => {
            let flav = flavor instanceof Function ? flavor(rollParts, data) : title;
            if (adv === 1) {
                rollParts[0] = ['2d20kh'];
                flav = `${title} (Fortune)`;
            } else if (adv === -1) {
                rollParts[0] = ['2d20kl'];
                flav = `${title} (Misfortune)`;
            }

            // Don't include situational bonuses unless they are defined
            if (form) data.itemBonus = form.find('[name="itemBonus"]').val();
            if ((!data.itemBonus || data.itemBonus === 0) && rollParts.indexOf('@itemBonus') !== -1)
                rollParts.splice(rollParts.indexOf('@itemBonus'), 1);
            if (form) data.statusBonus = form.find('[name="statusBonus"]').val();
            if ((!data.statusBonus || data.statusBonus === 0) && rollParts.indexOf('@statusBonus') !== -1)
                rollParts.splice(rollParts.indexOf('@statusBonus'), 1);
            if (form) data.circumstanceBonus = form.find('[name="circumstanceBonus"]').val();
            if (
                (!data.circumstanceBonus || data.circumstanceBonus === 0) &&
                rollParts.indexOf('@circumstanceBonus') !== -1
            )
                rollParts.splice(rollParts.indexOf('@circumstanceBonus'), 1);
            // Execute the roll and send it to chat
            const roll = new Roll(rollParts.join('+'), data).roll();
            roll.toMessage(
                {
                    speaker,
                    flavor: flav,
                    flags: {
                        pf2e: {
                            context: {
                                type: rollType,
                            },
                        },
                    },
                },
                {
                    rollMode: form ? form.find('[name="rollMode"]').val() : rollMode,
                },
            );
            return roll;
        };

        // Modify the roll and handle fast-forwarding
        parts = ['1d20'].concat(parts);
        if (
            (userSettingQuickD20Roll && !event.altKey && !(event.ctrlKey || event.metaKey) && !event.shiftKey) ||
            (!userSettingQuickD20Roll && event.shiftKey)
        ) {
            return _roll(parts, 0);
        } else if (event.ctrlKey || event.metaKey) {
            rollMode = 'blindroll'; // Forcing blind roll on control (or meta) click
            return _roll(parts, 0);
        } else if (event.shiftKey || !userSettingQuickD20Roll) {
            if (parts.indexOf('@circumstanceBonus') === -1) parts = parts.concat(['@circumstanceBonus']);
            if (parts.indexOf('@itemBonus') === -1) parts = parts.concat(['@itemBonus']);
            if (parts.indexOf('@statusBonus') === -1) parts = parts.concat(['@statusBonus']);

            // Render modal dialog
            template = template || 'systems/pf2e/templates/chat/roll-dialog.html';
            const dialogData = {
                data,
                rollMode,
                formula: parts.join(' + '),
                rollModes: CONFIG.Dice.rollModes,
            };
            const content = await renderTemplate(template, dialogData);
            let roll: Roll;
            return new Promise((resolve) => {
                new Dialog(
                    {
                        title,
                        content,
                        buttons: {
                            advantage: {
                                label: 'Fortune',
                                callback: (html) => {
                                    roll = _roll(parts, 1, html);
                                },
                            },
                            normal: {
                                label: 'Normal',
                                callback: (html) => {
                                    roll = _roll(parts, 0, html);
                                },
                            },
                            disadvantage: {
                                label: 'Misfortune',
                                callback: (html) => {
                                    roll = _roll(parts, -1, html);
                                },
                            },
                        },
                        default: 'normal',
                        close: (html) => {
                            if (onClose) onClose(html, parts, data);
                            resolve(roll);
                        },
                    },
                    dialogOptions,
                ).render(true);
            });
        } else {
            return _roll(parts, 0);
        }
    }

    /* -------------------------------------------- */

    /**
     * A standardized helper function for managing PF2e damage rolls
     *
     * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
     * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
     *
     * @param event         The triggering event which initiated the roll
     * @param partsCritOnly The dice roll component parts only added on a crit
     * @param parts         The dice roll component parts
     * @param actor         The Actor making the damage roll
     * @param data          Actor or item data against which to parse the roll
     * @param template      The HTML template used to render the roll dialog
     * @param title         The dice roll UI window title
     * @param speaker       The ChatMessage speaker to pass when creating the chat
     * @param flavor        A callable function for determining the chat message flavor given parts and data
     * @param critical      Allow critical hits to be chosen
     * @param onClose       Callback for actions to take when the dialog form is closed
     * @param dialogOptions Modal dialog options
     */
    static damageRoll({
        event,
        partsCritOnly = [],
        parts,
        data,
        template = '',
        title,
        speaker,
        flavor,
        critical = false,
        onClose,
        dialogOptions,
    }: {
        event: JQuery.Event;
        partsCritOnly?: any[];
        parts: any[];
        actor?: ActorPF2e;
        data: any;
        template?: string;
        title: string;
        speaker: foundry.data.ChatSpeakerSource;
        flavor?: any;
        critical?: boolean;
        onClose?: any;
        dialogOptions?: object;
    }) {
        // Inner roll function
        const rollMode = game.settings.get('core', 'rollMode');
        const userSettingQuickD20Roll = !game.user.getFlag('pf2e', 'settings.showRollDialogs');
        let rolled = false;
        const _roll = (rollParts: any, crit: boolean, form?: JQuery) => {
            // Don't include situational bonuses unless they are defined
            if (form) {
                data.itemBonus = form.find('[name="itemBonus"]').val();
                data.statusBonus = form.find('[name="statusBonus"]').val();
                data.circumstanceBonus = form.find('[name="circumstanceBonus"]').val();
            }
            for (const key of ['itemBonus', 'statusBonus', 'circumstanceBonus']) {
                if (!data[key] || data[key] === 0) {
                    let index: number;
                    const part = `@${key}`;

                    index = rollParts.indexOf(part);
                    if (index !== -1) rollParts.splice(index, 1);

                    index = partsCritOnly.indexOf(part);
                    if (index !== -1) partsCritOnly.splice(index, 1);
                }
            }

            const rule = game.settings.get('pf2e', 'critRule');
            if (crit) {
                if (rule === 'doubledamage') {
                    rollParts = [`(${rollParts.join('+')}) * 2`];
                } else {
                    const critRoll = new Roll(rollParts.join('+'), data).alter(2, 0, { multiplyNumeric: true });
                    rollParts = [critRoll.formula];
                }
                rollParts = rollParts.concat(partsCritOnly);
            }

            const roll = new Roll(rollParts.join('+'), data);
            const flav = flavor instanceof Function ? flavor(rollParts, data) : title;
            roll.toMessage(
                {
                    speaker,
                    flavor: flav,
                },
                {
                    rollMode: form ? (form.find<HTMLInputElement>('[name="rollMode"]').val() as RollMode) : rollMode,
                },
            );
            rolled = true;

            // Return the Roll object
            return roll;
        };

        // Modify the roll and handle fast-forwarding
        if (userSettingQuickD20Roll && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
            return _roll(parts, event.altKey || critical);
        } else if (!userSettingQuickD20Roll && (event.shiftKey || event.ctrlKey || event.metaKey)) {
            return _roll(parts, event.altKey || critical);
        }
        if (!parts.includes('@circumstanceBonus')) parts.push('@circumstanceBonus');
        if (!parts.includes('@itemBonus')) parts.push('@itemBonus');
        if (!parts.includes('@statusBonus')) parts.push('@statusBonus');

        // Construct dialog data
        template = template || 'systems/pf2e/templates/chat/roll-dialog.html';
        const dialogData = {
            data,
            rollMode,
            formula: parts.join(' + '),
            rollModes: CONFIG.Dice.rollModes,
        };

        // Render modal dialog
        let roll: Roll;
        return new Promise((resolve) => {
            renderTemplate(template, dialogData).then((content) => {
                new Dialog(
                    {
                        title,
                        content,
                        buttons: {
                            critical: {
                                condition: critical,
                                label: 'Critical Hit',
                                callback: (html) => {
                                    roll = _roll(parts, true, html);
                                },
                            },
                            normal: {
                                label: critical ? 'Normal' : 'Roll',
                                callback: (html) => {
                                    roll = _roll(parts, false, html);
                                },
                            },
                        },
                        default: 'normal',
                        close: (html) => {
                            if (onClose) onClose(html, parts, data);
                            resolve(rolled ? roll : false);
                        },
                    },
                    dialogOptions,
                ).render(true);
            });
        });
    }

    alter(add: number, multiply: number) {
        const rgx = new RegExp(DiceTerm.REGEXP, 'g');
        if (this._rolled) throw new Error('You may not alter a Roll which has already been rolled');

        // Update dice roll terms
        this.terms = this.terms?.map((t) =>
            t.replace(rgx, (_match, nd, d, mods) => {
                nd = nd * (multiply || 1) + (add || 0);
                mods = mods || '';
                return `${nd}d${d}${mods}`;
            }),
        );

        // Update the formula
        this._formula = this.terms?.join(' ');
        return this;
    }
}
