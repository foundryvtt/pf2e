import { StrikeData } from "@actor/data/base";
import { ModifierPF2e } from "@actor/modifiers";
import { ItemPF2e } from "@item";
import { ItemType } from "@item/data";
import { ChatMessagePF2e, DamageRollContextFlag } from "@module/chat-message";
import { ZeroToThree } from "@module/data";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success";
import { DamageRollContext } from "./helpers";
import { DamageRoll } from "./roll";
import { DamageType } from "./types";
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
                .map(async (note) => await TextEditor.enrichHTML(note.text, { rollData: noteRollData, async: true }))
        );
        const notes = damageNotes.join("<br />");
        flavor += `${notes}`;

        const formula = deepClone(damage.formula[outcome]);
        if (!formula) {
            ui.notifications.error(game.i18n.format("PF2E.UI.noDamageInfoForOutcome", { outcome }));
            return;
        }

        const { self, target } = context;
        const item = self?.item ?? null;
        const origin = item ? { uuid: item.uuid, type: item.type as ItemType } : null;
        const targetFlag = target ? { actor: target.actor.uuid, token: target.token.uuid } : null;

        // Retrieve strike flags. Strikes need refactoring to use ids before we can do better
        const strike = (() => {
            const isStrike = item?.isOfType("melee", "weapon");
            if (isStrike && item && self?.actor?.isOfType("character", "npc")) {
                const strikes: StrikeData[] = self.actor.system.actions;
                const strike = strikes.find(
                    (a): a is StrikeData & { item: ItemPF2e } => a.item?.id === item.id && a.item.slug === item.slug
                );

                if (strike) {
                    return {
                        actor: self.actor.uuid,
                        index: strikes.indexOf(strike),
                        damaging: true,
                        name: strike.item.name,
                        altUsage: item.isOfType("weapon") ? item.altUsageType : null,
                    };
                }
            }

            return null;
        })();

        // Create the damage roll, roll it, and pull the result
        const rollerId = game.userId;
        const degreeOfSuccess = DEGREE_OF_SUCCESS_STRINGS.indexOf(outcome) as ZeroToThree;
        const roll = await new DamageRoll("", {}, { rollerId, damage, degreeOfSuccess }).evaluate({ async: true });
        const rollData = roll.options.result;

        const rollMode = context.rollMode ?? "publicroll";
        const contextFlag: DamageRollContextFlag = {
            type: context.type,
            actor: context.self?.actor.id ?? null,
            token: context.self?.token?.id ?? null,
            target: targetFlag,
            domains: context.domains ?? [],
            options: Array.from(context.options).sort(),
            notes: context.notes ?? [],
            secret: context.secret ?? false,
            rollMode,
            traits: context.traits ?? [],
            skipDialog: context.skipDialog ?? !game.user.settings.showRollDialogs,
            outcome,
            unadjustedOutcome: context.unadjustedOutcome ?? null,
        };

        // For now rolls are pre-rendered, but swap to roll.toMessage() when the damage roll refactor is further along
        await ChatMessagePF2e.create(
            {
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                speaker: ChatMessagePF2e.getSpeaker({ actor: self?.actor, token: self?.token }),
                flavor,
                content: await roll.render(),
                roll: roll.toJSON(),
                sound: "sounds/dice.wav",
                flags: {
                    core: { canPopout: true },
                    pf2e: {
                        context: contextFlag,
                        damageRoll: rollData,
                        target: targetFlag,
                        origin,
                        strike,
                        preformatted: "both",
                    },
                },
            },
            { rollMode }
        );

        Hooks.call(`pf2e.damageRoll`, rollData);
        if (callback) callback(rollData);
    }
}
