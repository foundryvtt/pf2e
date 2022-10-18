import { ModifierPF2e } from "@actor/modifiers";
import { ItemType } from "@item/data";
import { ChatMessagePF2e, DamageRollFlag } from "@module/chat-message";
import { DamageRollContext } from "./helpers";
import { DamageCategory, DamageRollRenderData, DamageType } from "./types";
import { DAMAGE_TYPE_ICONS } from "./values";
import { DamageTemplate } from "./weapon";

/** Dialog for excluding certain modifiers before rolling for damage. */
export class DamageRollModifiersDialog extends Application {
    static async roll(damage: DamageTemplate, context: DamageRollContext, callback?: Function): Promise<void> {
        const outcome = context.outcome ?? "success";

        context.rollMode ??= (context.secret ? "blindroll" : undefined) ?? game.settings.get("core", "rollMode");

        const damageBaseModifier = ((): string => {
            if (damage.base.diceNumber > 0 && damage.base.modifier !== 0) {
                return damage.base.modifier > 0 ? ` + ${damage.base.modifier}` : ` - ${Math.abs(damage.base.modifier)}`;
            } else if (damage.base.modifier !== 0) {
                return damage.base.modifier.toString();
            }
            return "";
        })();

        const outcomeLabel = game.i18n.localize(`PF2E.Check.Result.Degree.Attack.${outcome}`);
        let flavor = `<strong>${damage.name}</strong> (${outcomeLabel})`;

        if (damage.traits) {
            interface ToTagsParams {
                labels?: Record<string, string | undefined>;
                descriptions?: Record<string, string | undefined>;
                cssClass: string | null;
                dataAttr: string;
            }
            const toTags = (
                slugs: string[],
                { labels = {}, descriptions = {}, cssClass, dataAttr }: ToTagsParams
            ): string =>
                slugs
                    .map((s) => ({ value: s, label: game.i18n.localize(labels[s] ?? "") }))
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((tag) => {
                        const description = descriptions[tag.value] ?? "";

                        const span = document.createElement("span");
                        span.className = "tag";
                        if (cssClass) span.classList.add(cssClass);
                        span.dataset[dataAttr] = tag.value;
                        span.dataset.description = description;
                        span.innerText = tag.label;

                        return span.outerHTML;
                    })
                    .join("");

            const traits = toTags(damage.traits, {
                labels: CONFIG.PF2E.actionTraits,
                descriptions: CONFIG.PF2E.traitsDescriptions,
                cssClass: null,
                dataAttr: "trait",
            });

            const item = context.self?.item;
            const itemTraits = item?.isOfType("weapon", "melee")
                ? toTags(Array.from(item.traits), {
                      labels: CONFIG.PF2E.npcAttackTraits,
                      descriptions: CONFIG.PF2E.traitsDescriptions,
                      cssClass: "tag_alt",
                      dataAttr: "trait",
                  })
                : "";

            const properties = ((): string => {
                if (item?.isOfType("weapon") && item.isRanged) {
                    // Show the range increment for ranged weapons
                    const { rangeIncrement } = item;
                    const slug = `range-increment-${rangeIncrement}`;
                    const label = game.i18n.format("PF2E.Item.Weapon.RangeIncrementN.Label", { range: rangeIncrement });
                    return toTags([slug], {
                        labels: { [slug]: label },
                        descriptions: { [slug]: "PF2E.Item.Weapon.RangeIncrementN.Hint" },
                        cssClass: "tag_secondary",
                        dataAttr: "slug",
                    });
                } else {
                    return "";
                }
            })();

            const materialEffects = toTags(damage.materials, {
                labels: CONFIG.PF2E.preciousMaterials,
                descriptions: CONFIG.PF2E.traitsDescriptions,
                cssClass: "tag_material",
                dataAttr: "material",
            });

            const otherTags = [itemTraits, properties, materialEffects].join("");

            flavor += `<div class="tags">${traits}<hr class="vr" />${otherTags}</div><hr>`;
        }

        const base =
            damage.base.diceNumber > 0
                ? `${damage.base.diceNumber}${damage.base.dieSize}${damageBaseModifier}`
                : damageBaseModifier.toString();
        const damageTypes = CONFIG.PF2E.damageTypes;
        const damageCategories = CONFIG.PF2E.damageCategories;
        const damageTypeLabel = game.i18n.localize(damageTypes[damage.base.damageType] ?? damage.base.damageType);
        const baseBreakdown = `<span class="tag tag_transparent">${base} ${damageTypeLabel}</span>`;
        const modifierBreakdown = [damage.diceModifiers.filter((m) => m.diceNumber !== 0), damage.numericModifiers]
            .flat()
            .filter((m) => m.enabled && (!m.critical || outcome === "criticalSuccess"))
            .sort((a, b) =>
                a.damageType === damage.base.damageType && b.damageType === damage.base.damageType
                    ? 0
                    : a.damageType === damage.base.damageType
                    ? -1
                    : b.damageType === damage.base.damageType
                    ? 1
                    : 0
            )
            .map((m) => {
                const modifier = m instanceof ModifierPF2e ? ` ${m.modifier < 0 ? "" : "+"}${m.modifier}` : "";
                const damageType =
                    m.damageType && m.damageType !== damage.base.damageType
                        ? game.i18n.localize(damageTypes[m.damageType as DamageType] ?? m.damageType)
                        : null;
                const typeLabel = damageType ? ` ${damageType}` : "";

                return `<span class="tag tag_transparent">${m.label} ${modifier}${typeLabel}</span>`;
            })
            .join("");
        flavor += `<div class="tags">${baseBreakdown}${modifierBreakdown}</div>`;

        const noteRollData = context.self?.item?.getRollData();
        const damageNotes = await Promise.all(
            damage.notes
                .filter((note) => note.outcome.length === 0 || note.outcome.includes(outcome))
                .map(
                    async (note) =>
                        await game.pf2e.TextEditor.enrichHTML(note.text, { rollData: noteRollData, async: true })
                )
        );
        const notes = damageNotes.join("<br />");
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
        const renderData: DamageRollRenderData = {
            formula: formula.formula,
            damageTypes: {},
            total: 1,
        };
        const rolls: Rolled<Roll>[] = [];

        for (const [damageType, categories] of Object.entries(formula.partials)) {
            rollData.diceResults[damageType] = {};
            renderData.damageTypes[damageType] = {
                categories: {},
                icon: DAMAGE_TYPE_ICONS[damageType] ?? damageType,
                label: damageTypes[damageType as DamageType] ?? damageType,
            };
            for (const [damageCategory, partial] of Object.entries(categories)) {
                const data: object = formula.data;
                const roll = await new Roll(partial, data).evaluate({ async: true });
                rolls.push(roll);
                const damageValue = rollData.types[damageType] ?? {};
                damageValue[damageCategory] = roll.total;
                rollData.types[damageType] = damageValue;
                rollData.total += roll.total;
                rollData.diceResults[damageType][damageCategory] = [];
                renderData.damageTypes[damageType].categories[damageCategory] = {
                    dice: roll.dice.flatMap((d) =>
                        d.results.map((r) => {
                            // Record the partial result for the roll flag
                            rollData.diceResults[damageType][damageCategory].push(r.result);
                            // Return the needed render data
                            return { faces: d.faces ?? 0, result: r.result };
                        })
                    ),
                    formula: partial,
                    label: damageCategories[damageCategory as DamageCategory] ?? damageCategory,
                    total: roll.total,
                };
            }
        }
        // Combine the rolls into a single roll of a dice pool
        const roll = (() => {
            const pool = PoolTerm.fromRolls(rolls);
            // Work around above cobbling together roll card template above while constructing the actual roll
            const firstResult = pool.results.at(0);
            if (rollData.total === 0 && firstResult?.result === 0) {
                rollData.total = 1;
                firstResult.result = 1;
            }
            return Roll.fromTerms([pool]);
        })();

        renderData.total = rollData.total;
        const content = await renderTemplate("systems/pf2e/templates/chat/damage/damage-card-content.html", renderData);

        const { self, target } = context;
        const item = self?.item ?? null;
        const origin = item ? { uuid: item.uuid, type: item.type as ItemType } : null;
        const targetFlag = target ? { actor: target.actor.uuid, token: target.token.uuid } : null;

        await ChatMessagePF2e.create(
            {
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                speaker: ChatMessagePF2e.getSpeaker({ actor: self?.actor, token: self?.token }),
                flavor,
                content,
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
}
