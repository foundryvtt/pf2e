/**
 * Dialog for excluding certain modifiers before rolling for damage.
 */

import { DegreeOfSuccessString } from '@system/check-degree-of-success';
import { PF2RollNote } from '@module/notes';
import { PF2WeaponDamage } from './damage/weapon';

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
        const outcome = (ctx.outcome ?? 'success') as DegreeOfSuccessString;

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? 'blindroll' : undefined) ?? game.settings.get('core', 'rollMode') ?? 'roll';

        let damageBaseModifier = '';
        if (damage.base.modifier) {
            damageBaseModifier =
                damage.base.modifier > 0 ? ` + ${damage.base.modifier}` : ` - ${Math.abs(damage.base.modifier)}`;
        }

        const outcomeLabel = game.i18n.localize(`PF2E.CheckOutcome.${outcome}`);
        let flavor = `<b>${damage.name}</b> (${outcomeLabel})`;
        if (damage.traits) {
            const traits = damage.traits
                .map((trait) => CONFIG.PF2E.weaponTraits[trait] ?? trait)
                .map((trait) => `<span class="tag">${trait}</span>`)
                .join('');
            flavor += `<div class="tags">${traits}</div><hr>`;
        }

        const baseBreakdown = `<span class="damage-tag damage-tag-base">${game.i18n.localize('Base')} ${
            damage.base.diceNumber
        }${damage.base.dieSize}${damageBaseModifier} ${damage.base.damageType}</span>`;
        const modifierBreakdown = PF2WeaponDamage.getDamageModifiers(damage, outcome === 'criticalSuccess')
            .map((m) => {
                return `<span class="damage-tag damage-tag-modifier">${m}</span>`;
            })
            .join('');
        flavor += `<div style="display: flex; flex-wrap: wrap;">${baseBreakdown}${modifierBreakdown}</div>`;

        const notes = ((damage.notes ?? []) as PF2RollNote[])
            .filter((note) => note.outcome.length === 0 || note.outcome.includes(outcome))
            .map((note) => TextEditor.enrichHTML(note.text))
            .join('<br />');
        flavor += `${notes}`;

        const formula = duplicate(damage.formula[outcome]);
        const rollData: any = {
            outcome,
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
