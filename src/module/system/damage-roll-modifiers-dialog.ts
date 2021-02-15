/**
 * Dialog for excluding certain modifiers before rolling for damage.
 */

import { DamagePool } from './damage/damage-pool';
import { groupBy } from '../utils';
import { DamageFormula } from './damage/damage-formula';

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
        const ctx = context ?? {};

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? 'blindroll' : undefined) ?? game.settings.get('core', 'rollMode') ?? 'roll';

        let damageBaseModifier = '';
        if (damage.base.modifier) {
            damageBaseModifier =
                damage.base.modifier > 0 ? ` + ${damage.base.modifier}` : ` - ${Math.abs(damage.base.modifier)}`;
        }

        const outcome = game.i18n.localize(`PF2E.CheckOutcome.${ctx.outcome ?? 'success'}`);
        let flavor = `<b>${damage.name}</b> (${outcome})`;
        if (damage.traits) {
            const traits = damage.traits
                .map((trait) => CONFIG.PF2E.weaponTraits[trait] ?? trait)
                .map((trait) => `<span class="tag">${trait}</span>`)
                .join('');
            flavor += `<div class="tags">${traits}</div><hr>`;
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
            .filter((m) => !m.critical || ctx.outcome === 'criticalSuccess')
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
        flavor += `<div style="display: flex; flex-wrap: wrap;">${baseBreakdown}${modifierBreakdown}</div>`;

        const notes = (damage.notes ?? []).map((note) => TextEditor.enrichHTML(note.text)).join('<br />');
        flavor += `${notes}`;

        const damagePool: DamagePool = damage.formula[ctx.outcome ?? 'success'];
        const rollData: any = {
            outcome: ctx.outcome ?? 'success',
            rollMode: ctx.rollMode ?? 'roll',
            traits: damage.traits ?? [],
            types: {},
            total: 0,
            diceResults: {},
            baseDamageDice: damage.effectDice,
        };
        const rolls: Roll[] = [];
        const dsnData: any = { throws: [{ dice: [] }] };

        let content = `
    <div class="dice-roll">
        <div class="dice-result">
            <div class="dice-formula">${new DamageFormula(damagePool.entries)}</div>
            <div class="dice-tooltip" style="display: none;">`;

        const damageByType = groupBy(damagePool.entries, (entry) => entry.damageType);
        for (const [damageType, categoryEntries] of damageByType.entries()) {
            content += `<div class="damage-type ${damageType}">`;
            content += `<h3 class="flexrow"><span>${damageType}</span><i class="fa fa-${DamageRollModifiersDialog.getDamageTypeIcon(
                damageType,
            )}"></i></h3>`;

            rollData.diceResults[damageType] = {};
            const damageByCategory = groupBy(categoryEntries, (entry) => entry.category);

            for (const [damageCategory, entries] of damageByCategory) {
                const roll: any = new Roll(new DamageFormula(entries).toString(), damagePool.data);
                const formula = roll.formula;

                roll.roll();
                rolls.push(roll);

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
                        <span class="part-formula">${formula}</span>
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

        // fake dice pool roll to ensure Dice So Nice properly trigger the dice animation
        const roll = (() => {
            const pool = new DicePool({ rolls }).evaluate();
            const roll = Roll.create(pool.formula).evaluate();
            roll.terms = [pool];
            roll.results = [pool.total];
            roll._total = pool.total;
            roll._rolled = true;
            return roll;
        })();

        ChatMessage.create(
            {
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                speaker: ChatMessage.getSpeaker(),
                flavor,
                content: content.trim(),
                roll,
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
