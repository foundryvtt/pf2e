/* global game, CONFIG */
/**
 * Dialog for excluding certain modifiers before rolling for damage.
 */

/**
 * @category Other
 */
export class DamageRollModifiersDialog extends Application {
    private static DAMAGE_TYPE_ICONS = Object.freeze({
        acid: 'vial',
        bludgeoning: 'hammer',
        chaotic: 'dizzy',
        cold: 'snowflake',
        electricity: 'bolt',
        evil: 'crow',
        fire: 'fire',
        force: 'hand-sparkles',
        good: 'dove',
        lawful: 'balance-scale',
        mental: 'brain',
        negative: 'skull',
        piercing: 'bow-arrow',
        poison: 'spider',
        positive: 'sun',
        slashing: 'swords',
        sonic: 'volume-up',
    });

    damage: object;
    context: object;
    callback: any;

    /**
     * @param {object} damage
     * @param {object} context
     * @param {function} callback
     */
    constructor(damage, context, callback) {
        super({
            title: damage.name,
            template: 'systems/pf2e/templates/chat/check-modifiers-dialog.html', // change this later
            classes: ['dice-checks', 'dialog'],
            popOut: true,
            width: 380,
        });
        this.damage = damage;
        this.context = context;
        this.callback = callback;
    }

    /**
     * @param {object} damage
     * @param {object} context
     * @param {function} callback
     */
    static roll(damage, context, callback) {
        const options = damage.tags ?? [];
        const ctx = context ?? {};

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? 'blindroll' : undefined) ?? game.settings.get('core', 'rollMode') ?? 'roll';

        let damageBaseModifier = '';
        if (damage.base.modifier) {
            damageBaseModifier =
                damage.base.modifier > 0 ? ` + ${damage.base.modifier}` : ` - ${Math.abs(damage.base.modifier)}`;
        }
        const baseStyle =
            'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #999; border-radius: 3px; color: white; background: rgba(0, 0, 0, 0.45);';
        const baseBreakdown = `<span style="${baseStyle}">${game.i18n.localize('Base')} ${damage.base.diceNumber}${
            damage.base.dieSize
        }${damageBaseModifier} ${damage.base.damageType}</span>`;
        const modifierStyle =
            'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #999; border-radius: 3px; background: rgba(0, 0, 0, 0.05);';
        const modifierBreakdown = []
            .concat(damage.diceModifiers)
            .concat(damage.numericModifiers)
            .filter((m) => m.enabled)
            .filter((m) => !m.critical || context.outcome === 'criticalSuccess')
            .map((m) => {
                const label = game.i18n.localize(m.label ?? m.name);
                const modifier =
                    m.modifier === undefined || Number.isNaN(m.modifier)
                        ? ''
                        : ` ${m.modifier < 0 ? '' : '+'}${m.modifier}`;
                const damageType = m.damageType && m.damageType !== damage.base.damageType ? ` ${m.damageType}` : '';
                return `<span style="${modifierStyle}">${label}${modifier}${damageType}</span>`;
            })
            .join('');

        const optionStyle =
            'white-space: nowrap; margin: 0 2px 2px 0; padding: 0 3px; font-size: 10px; line-height: 16px; border: 1px solid #000000; border-radius: 3px; color: white; background: var(--secondary);';
        const optionBreakdown = options
            .map((o) => `<span style="${optionStyle}">${game.i18n.localize(CONFIG.PF2E.weaponTraits[o])}</span>`)
            .join('');

        const notes = (damage.notes ?? []).map((note) => TextEditor.enrichHTML(note.text)).join('<br />');

        const formula = duplicate(damage.formula[context.outcome ?? 'success']);
        const rollData: any = {
            outcome: context.outcome ?? 'success',
            rollMode: ctx.rollMode ?? 'roll',
            traits: damage.traits ?? [],
            types: {},
            total: 0,
            diceResults: {},
            baseDamageDice: damage.effectDice,
        };
        const dsnData: any = { throws: [{ dice: [] }] };
        let content = `
    <div class="dice-roll">
        <div class="dice-result">
            <div class="dice-formula">${formula.formula}</div>
            <div class="dice-tooltip" style="display: none;">`;
        for (const [damageType, categories] of Object.entries(formula.partials)) {
            content += `<div class="damage-type ${damageType}">`;
            content += `<h3 class="flexrow"><span>${damageType}</span><i class="fa fa-${DamageRollModifiersDialog.getDamageTypeIcon(
                damageType,
            )}"></i></h3>`;
            rollData.diceResults[damageType] = {};
            for (const [damageCategory, partial] of Object.entries(categories)) {
                const roll: any = new Roll(partial as string, formula.data).roll();
                const damageValue = rollData.types[damageType] ?? {};
                damageValue[damageCategory] = roll.total;
                rollData.types[damageType] = damageValue;
                rollData.total += roll.total;
                rollData.diceResults[damageType][damageCategory] = [];
                const dice = roll.dice
                    .flatMap((d) =>
                        d.results.map((r) => {
                            dsnData.throws[0].dice.push({
                                result: r.result,
                                resultLabel: r.result,
                                type: `d${d.faces}`,
                                vectors: [],
                                options: {},
                            });
                            rollData.diceResults[damageType][damageCategory].push(r.result);
                            return `<li class="roll die d${d.faces}">${r.result}</li>`;
                        }),
                    )
                    .join('\n');
                content += `
            <section class="tooltip-part">
                <div class="dice">
                    <header class="part-header flexrow">
                        <span class="part-formula">${partial}</span>
                        <span class="part-flavor">${damageCategory}</span>
                        <span class="part-total">${roll.total}</span>
                    </header>
                    <ol class="dice-rolls">${dice}</ol>
                </div>
            </section>
            `;
            }
            content += '</div>';
        }
        content += `</div><h4 class="dice-total"><span id="value">${rollData.total}</span></h4></div></div>`;
        let dice3d = Promise.resolve();
        if (game?.dice3d?.show) {
            dice3d = game.dice3d.show(dsnData);
        }
        dice3d.then((_) => {
            const outcome = game.i18n.localize(`PF2E.CheckOutcome.${context.outcome ?? 'success'}`);
            ChatMessage.create(
                {
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    speaker: ChatMessage.getSpeaker(),
                    flavor: `
                <b>${damage.name}</b> (${outcome})
                <div style="display: flex; flex-wrap: wrap;">${baseBreakdown}${modifierBreakdown}${optionBreakdown}</div>
                ${notes}
            `,
                    content: content.trim(),
                    roll: new Roll('0').roll(), // dummy roll to ensure Dice So Nice does not break
                    flags: {
                        core: {
                            canPopout: true,
                        },
                        [game.system.id]: {
                            damageRoll: rollData,
                        },
                    },
                },
                {
                    rollMode: ctx.rollMode ?? 'roll',
                },
            );
            Hooks.call(`${game.system.id}.damageRoll`, rollData);
            if (callback) {
                callback(rollData);
            }
        });
    }

    getData() {
        return {
            damage: this.damage,
        };
    }

    private static getDamageTypeIcon(damageType: string): string {
        return DamageRollModifiersDialog.DAMAGE_TYPE_ICONS[damageType] ?? damageType;
    }
}
