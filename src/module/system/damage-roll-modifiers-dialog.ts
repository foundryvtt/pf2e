import { DegreeOfSuccessString } from "@system/check-degree-of-success";
import { RollNotePF2e } from "@module/notes";
import { DiceModifierPF2e, ModifierPF2e, RawModifier } from "@module/modifiers";
import { DamageTemplate } from "@system/damage/weapon";
import { ChatMessagePF2e } from "@module/chat-message";
import type { ItemPF2e } from "@item";

/** Dialog for excluding certain modifiers before rolling for damage. */
export class DamageRollModifiersDialog extends Application {
    private static DAMAGE_TYPE_ICONS = Object.freeze({
        acid: "vial",
        bludgeoning: "hammer",
        chaotic: "dizzy",
        cold: "snowflake",
        electricity: "bolt",
        evil: "crow",
        fire: "fire",
        force: "hand-sparkles",
        good: "dove",
        lawful: "balance-scale",
        mental: "brain",
        negative: "skull",
        piercing: "bow-arrow",
        poison: "spider",
        positive: "sun",
        slashing: "swords",
        sonic: "volume-up",
    });

    damage: object;
    context: object;
    callback: any;

    constructor(damage: any, context: any, callback: any) {
        super({
            title: damage.name,
            template: "systems/pf2e/templates/chat/check-modifiers-dialog.html", // change this later
            classes: ["dice-checks", "dialog"],
            popOut: true,
            width: 380,
        });
        this.damage = damage;
        this.context = context;
        this.callback = callback;
    }

    static roll(damage: DamageTemplate, context: any, callback: any) {
        const ctx = context ?? {};
        const outcome = (ctx.outcome ?? "success") as DegreeOfSuccessString;

        ctx.rollMode =
            ctx.rollMode ?? (ctx.secret ? "blindroll" : undefined) ?? game.settings.get("core", "rollMode") ?? "roll";

        let damageBaseModifier = "";
        if (damage.base.modifier) {
            damageBaseModifier =
                damage.base.modifier > 0 ? ` + ${damage.base.modifier}` : ` - ${Math.abs(damage.base.modifier)}`;
        }

        const outcomeLabel = game.i18n.localize(`PF2E.CheckOutcome.${outcome}`);
        let flavor = `<b>${damage.name}</b> (${outcomeLabel})`;
        if (damage.traits) {
            const traits = damage.traits
                .map((trait) => game.i18n.localize(CONFIG.PF2E.weaponTraits[trait]) ?? trait)
                .map((trait) => `<span class="tag">${trait}</span>`)
                .join("");
            flavor += `<div class="tags">${traits}</div><hr>`;
        }

        const baseBreakdown = `<span class="damage-tag damage-tag-base">${game.i18n.localize("Base")} ${
            damage.base.diceNumber
        }${damage.base.dieSize}${damageBaseModifier} ${damage.base.damageType}</span>`;
        const modifierBreakdown = ([] as RawModifier[])
            .concat(damage.diceModifiers.filter((m: DiceModifierPF2e) => m.diceNumber !== 0))
            .concat(damage.numericModifiers)
            .filter((m) => m.enabled)
            .filter((m) => !m.critical || outcome === "criticalSuccess")
            .map((m) => {
                const label = game.i18n.localize(m.label ?? m.name);
                const modifier = m instanceof ModifierPF2e ? ` ${m.modifier < 0 ? "" : "+"}${m.modifier}` : "";
                const damageType = m.damageType && m.damageType !== damage.base.damageType ? ` ${m.damageType}` : "";
                return `<span class="damage-tag damage-tag-modifier">${label}${modifier}${damageType}</span>`;
            })
            .join("");
        flavor += `<div style="display: flex; flex-wrap: wrap;">${baseBreakdown}${modifierBreakdown}</div>`;

        const notes = ((damage.notes ?? []) as RollNotePF2e[])
            .filter((note) => note.outcome.length === 0 || note.outcome.includes(outcome))
            .map((note) => TextEditor.enrichHTML(note.text))
            .join("<br />");
        flavor += `${notes}`;

        const formula = duplicate(damage.formula[outcome]);
        if (!formula) {
            ui.notifications.error(game.i18n.format("PF2E.UI.noDamageInfoForOutcome", { outcome }));
            return;
        }
        const rollData: any = {
            outcome,
            rollMode: ctx.rollMode ?? "roll",
            traits: damage.traits ?? [],
            types: {},
            total: 0,
            diceResults: {},
            baseDamageDice: damage.effectDice,
        };
        const rolls: Rolled<Roll>[] = [];
        let content = `
    <div class="dice-roll">
        <div class="dice-result">
            <div class="dice-formula">${formula.formula}</div>
            <div class="dice-tooltip" style="display: none;">`;
        for (const [damageType, categories] of Object.entries(formula.partials)) {
            content += `<div class="damage-type ${damageType}">`;
            content += `<h3 class="flexrow"><span>${damageType}</span><i class="fa fa-${DamageRollModifiersDialog.getDamageTypeIcon(
                damageType
            )}"></i></h3>`;
            rollData.diceResults[damageType] = {};
            for (const [damageCategory, partial] of Object.entries(categories)) {
                const roll = new Roll(partial, formula.data).evaluate({ async: false });
                rolls.push(roll);
                const damageValue = rollData.types[damageType] ?? {};
                damageValue[damageCategory] = roll.total;
                rollData.types[damageType] = damageValue;
                rollData.total += roll.total;
                rollData.diceResults[damageType][damageCategory] = [];
                const dice = roll.dice
                    .flatMap((d) =>
                        d.results.map((r) => {
                            rollData.diceResults[damageType][damageCategory].push(r.result);
                            return `<li class="roll die d${d.faces}">${r.result}</li>`;
                        })
                    )
                    .join("\n");
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
            content += "</div>";
        }
        content += `</div><h4 class="dice-total"><span id="value">${rollData.total}</span></h4></div></div>`;

        // Combine the rolls into a single roll of a dice pool
        const roll = (() => {
            if (rolls.length === 1) return rolls[0];
            const pool = PoolTerm.fromRolls(rolls);
            // Work around foundry bug where `fromData` doubles the number of dice from a pool
            const data = pool.toJSON();
            delete data.rolls;
            const roll = Roll.fromData({ formula: pool.formula, terms: [pool] });
            return roll;
        })();

        const item: ItemPF2e | null = context.item ?? null;
        const origin = item ? { uuid: item.uuid, type: item.type } : null;
        ChatMessagePF2e.create(
            {
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                speaker: ChatMessagePF2e.getSpeaker(),
                flavor,
                content: content.trim(),
                roll,
                sound: "sounds/dice.wav",
                flags: {
                    core: {
                        canPopout: true,
                    },
                    pf2e: {
                        damageRoll: rollData,
                        origin,
                    },
                },
            },
            {
                rollMode: ctx.rollMode ?? "roll",
            }
        );
        Hooks.call(`${game.system.id}.damageRoll`, rollData);
        if (callback) {
            callback(rollData);
        }
    }

    override getData() {
        return {
            damage: this.damage,
        };
    }

    private static getDamageTypeIcon(damageType: string): string {
        return DamageRollModifiersDialog.DAMAGE_TYPE_ICONS[damageType] ?? damageType;
    }
}
