import { ModifierPF2e } from "@module/modifiers";
import { DamageTemplate } from "@system/damage/weapon";
import { ChatMessagePF2e } from "@module/chat-message";
import { DamageRollFlag } from "@module/chat-message/data";
import { DamageRollContext } from "./damage/damage";

/** Dialog for excluding certain modifiers before rolling for damage. */
export class DamageRollModifiersDialog extends Application {
    private static DAMAGE_TYPE_ICONS: Record<string, string | undefined> = {
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
    };

    static async roll(damage: DamageTemplate, context: DamageRollContext, callback?: Function): Promise<void> {
        const outcome = context.outcome ?? "success";

        context.rollMode ??= (context.secret ? "blindroll" : undefined) ?? game.settings.get("core", "rollMode");

        let damageBaseModifier = "";
        if (damage.base.modifier) {
            damageBaseModifier =
                damage.base.modifier > 0 ? ` + ${damage.base.modifier}` : ` - ${Math.abs(damage.base.modifier)}`;
        }

        const outcomeLabel = game.i18n.localize(`PF2E.Check.Result.Degree.Attack.${outcome}`);
        let flavor = `<b>${damage.name}</b> (${outcomeLabel})`;
        if (context.target)
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

        const base = game.i18n.localize("PF2E.Damage.Base");
        const dice = `${damage.base.diceNumber}${damage.base.dieSize}${damageBaseModifier}`;
        const baseBreakdown = `<span class="damage-tag damage-tag-base">${base} ${dice} ${damage.base.damageType}</span>`;
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

        const noteRollData = context.self?.item?.getRollData();
        const notes = damage.notes
            .filter((note) => note.outcome.length === 0 || note.outcome.includes(outcome))
            .map((note) => game.pf2e.TextEditor.enrichHTML(note.text, { rollData: noteRollData }))
            .join("<br />");
        flavor += `${notes}`;

        const formula = deepClone(damage.formula[outcome]);
        if (!formula) {
            ui.notifications.error(game.i18n.format("PF2E.UI.noDamageInfoForOutcome", { outcome }));
            return;
        }

        const rollData: DamageRollFlag = {
            outcome,
            rollMode: context.rollMode ?? "publicroll",
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
            const icon = DamageRollModifiersDialog.getDamageTypeIcon(damageType);
            content += `<div class="damage-type ${damageType}">`;
            content += `<h3 class="flexrow"><span>${damageType}</span><i class="fa fa-${icon}"></i></h3>`;
            rollData.diceResults[damageType] = {};
            for (const [damageCategory, partial] of Object.entries(categories)) {
                const data: object = formula.data;
                const roll = await new Roll(partial, data).evaluate({ async: true });
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

        const { self, target } = context;
        const item = self?.item ?? null;
        const origin = item ? { uuid: item.uuid, type: item.data.type } : null;
        const targetFlag = target ? { actor: target.actor.uuid, token: target.token.uuid } : null;

        await ChatMessagePF2e.create(
            {
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                speaker: ChatMessagePF2e.getSpeaker({ actor: self?.actor, token: self?.token }),
                flavor,
                content: content.trim(),
                roll: roll.toJSON(),
                sound: "sounds/dice.wav",
                flags: {
                    core: { canPopout: true },
                    pf2e: {
                        damageRoll: rollData,
                        target: targetFlag,
                        origin,
                        preformatted: "both",
                    },
                },
            },
            { rollMode: context.rollMode ?? "publicroll" }
        );
        Hooks.call(`pf2e.damageRoll`, rollData);
        if (callback) callback(rollData);
    }

    private static getDamageTypeIcon(damageType: string): string {
        return DamageRollModifiersDialog.DAMAGE_TYPE_ICONS[damageType] ?? damageType;
    }
}
