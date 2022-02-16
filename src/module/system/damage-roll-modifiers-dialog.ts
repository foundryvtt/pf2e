import { DegreeOfSuccessString } from "@system/check-degree-of-success";
import { RollNotePF2e } from "@module/notes";
import { ModifierPF2e } from "@module/modifiers";
import { DamageTemplate } from "@system/damage/weapon";
import { ChatMessagePF2e } from "@module/chat-message";
import { DamageRollFlag } from "@module/chat-message/data";
import { CheckRollContext } from "./rolls";

/** Dialog for excluding certain modifiers before rolling for damage. */
export class DamageRollModifiersDialog extends Application {
    private static DAMAGE_TYPE_ICONS: Record<string, string | undefined> = Object.freeze({
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

    static roll(damage: DamageTemplate, context: CheckRollContext = {}, callback?: Function) {
        const ctx = context ?? {};
        const outcome = (ctx.outcome ?? "success") as DegreeOfSuccessString;

        ctx.rollMode ??= (ctx.secret ? "blindroll" : undefined) ?? game.settings.get("core", "rollMode");

        let damageBaseModifier = "";
        if (damage.base.modifier) {
            damageBaseModifier =
                damage.base.modifier > 0 ? ` + ${damage.base.modifier}` : ` - ${Math.abs(damage.base.modifier)}`;
        }

        const outcomeLabel = game.i18n.localize(`PF2E.CheckOutcome.${outcome}`);
        let flavor = `<b>${damage.name}</b> (${outcomeLabel})`;
        if (damage.traits) {
            const strikeTraits: Record<string, string | undefined> = {
                ...CONFIG.PF2E.npcAttackTraits,
                attack: "PF2E.TraitAttack",
            };
            const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
            const traits = damage.traits
                .map((trait) => ({ value: trait, label: game.i18n.localize(strikeTraits[trait] ?? "") }))
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((trait) => {
                    const description = traitDescriptions[trait.value] ?? "";
                    return `<span class="tag" data-trait="${trait.value}" data-description="${description}">${trait.label}</span>`;
                })
                .join("");
            flavor += `<div class="tags">${traits}</div><hr>`;
        }

        const baseBreakdown = `<span class="damage-tag damage-tag-base">${game.i18n.localize("Base")} ${
            damage.base.diceNumber
        }${damage.base.dieSize}${damageBaseModifier} ${damage.base.damageType}</span>`;
        const modifierBreakdown = [
            ...damage.diceModifiers.filter((m) => m.diceNumber !== 0),
            ...damage.numericModifiers,
        ]
            .filter((m) => m.enabled && (!m.critical || outcome === "criticalSuccess"))
            .map((m) => {
                const modifier = m instanceof ModifierPF2e ? ` ${m.modifier < 0 ? "" : "+"}${m.modifier}` : "";
                const damageType = m.damageType && m.damageType !== damage.base.damageType ? ` ${m.damageType}` : "";
                return `<span class="damage-tag damage-tag-modifier">${m.label} ${modifier}${damageType}</span>`;
            })
            .join("");
        flavor += `<div class="tags">${baseBreakdown}${modifierBreakdown}</div>`;

        const notes = ((damage.notes ?? []) as RollNotePF2e[])
            .filter((note) => note.outcome.length === 0 || note.outcome.includes(outcome))
            .map((note) => game.pf2e.TextEditor.enrichHTML(note.text))
            .join("<br />");
        flavor += `${notes}`;

        const formula = duplicate(damage.formula[outcome]);
        if (!formula) {
            ui.notifications.error(game.i18n.format("PF2E.UI.noDamageInfoForOutcome", { outcome }));
            return;
        }

        const rollData: DamageRollFlag = {
            outcome,
            rollMode: ctx.rollMode ?? "publicroll",
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
        rollData.total = Math.max(rollData.total, 1);
        content += `</div><h4 class="dice-total"><span id="value">${rollData.total}</span></h4></div></div>`;

        // Combine the rolls into a single roll of a dice pool
        const roll = (() => {
            if (rolls.length === 1) return rolls[0];
            const pool = PoolTerm.fromRolls(rolls);
            return Roll.fromTerms([pool]);
        })();

        const item = context.item ?? null;
        const origin = item ? { uuid: item.uuid, type: item.data.type } : null;
        ChatMessagePF2e.create(
            {
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                speaker: ChatMessagePF2e.getSpeaker({ actor: ctx.actor, token: ctx.token }),
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
                        preformatted: "both",
                    },
                },
            },
            {
                rollMode: ctx.rollMode ?? "publicroll",
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
