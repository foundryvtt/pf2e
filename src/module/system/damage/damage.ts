import { StrikeData } from "@actor/data/base.ts";
import { ItemPF2e } from "@item";
import { ChatMessagePF2e, DamageRollContextFlag } from "@module/chat-message/index.ts";
import { ZeroToThree } from "@module/data.ts";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success.ts";
import { DamageRoll, DamageRollDataPF2e } from "./roll.ts";
import { DamageRollContext, DamageTemplate } from "./types.ts";
import { ActorPF2e } from "@actor";

/** Create a chat message containing a damage roll */
export class DamagePF2e {
    static async roll(
        data: DamageTemplate,
        context: DamageRollContext,
        callback?: Function
    ): Promise<Rolled<DamageRoll> | null> {
        const outcome = context.outcome ?? null;

        context.rollMode ??= (context.secret ? "blindroll" : undefined) ?? game.settings.get("core", "rollMode");
        context.createMessage ??= true;

        // Change default roll mode to blind GM roll if the "secret" option is specified
        if (context.options.has("secret")) {
            context.secret = true;
        }

        let flavor = `<strong>${data.name}</strong>`;
        if (context.sourceType === "attack") {
            const outcomeLabel = game.i18n.localize(`PF2E.Check.Result.Degree.Attack.${outcome}`);
            flavor += ` (${outcomeLabel})`;
        } else if (context.sourceType === "check") {
            const outcomeLabel = game.i18n.localize(`PF2E.Check.Result.Degree.Check.${outcome}`);
            flavor += ` (${outcomeLabel})`;
        }

        if (data.traits) {
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

            const traits = toTags(data.traits, {
                labels: CONFIG.PF2E.actionTraits,
                descriptions: CONFIG.PF2E.traitsDescriptions,
                cssClass: null,
                dataAttr: "trait",
            });

            const item = context.self?.item;
            const itemTraits = item?.isOfType("weapon", "melee", "spell")
                ? toTags(
                      // Materials are listed in a separate group of tags
                      Array.from(item.traits).filter((t) => !(t in CONFIG.PF2E.materialDamageEffects)),
                      {
                          labels: item.isOfType("spell") ? CONFIG.PF2E.spellTraits : CONFIG.PF2E.npcAttackTraits,
                          descriptions: CONFIG.PF2E.traitsDescriptions,
                          cssClass: "tag_alt",
                          dataAttr: "trait",
                      }
                  )
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

            const materialEffects = toTags(data.materials, {
                labels: CONFIG.PF2E.preciousMaterials,
                descriptions: CONFIG.PF2E.traitsDescriptions,
                cssClass: "tag_material",
                dataAttr: "material",
            });

            const otherTags = [itemTraits, properties, materialEffects].join("");

            flavor +=
                otherTags.length > 0
                    ? `<div class="tags">${traits}<hr class="vr" />${otherTags}</div><hr>`
                    : `<div class="tags">${traits}</div><hr>`;
        }

        // Add breakdown to flavor
        const breakdown = Array.isArray(data.damage.breakdown)
            ? data.damage.breakdown
            : data.damage.breakdown[outcome ?? "success"];
        const breakdownTags = breakdown.map((b) => `<span class="tag tag_transparent">${b}</span>`);
        flavor += `<div class="tags">${breakdownTags.join("")}</div>`;

        // Create the damage roll and evaluate. If already created, evalute the one we've been given instead
        const roll = await (() => {
            const damage = data.damage;
            if ("roll" in damage) {
                return damage.roll.evaluate({ async: true });
            }

            const formula = deepClone(damage.formula[outcome ?? "success"]);
            if (!formula) {
                ui.notifications.error(game.i18n.format("PF2E.UI.noDamageInfoForOutcome", { outcome }));
                return null;
            }

            const rollerId = game.userId;
            const degreeOfSuccess = outcome ? (DEGREE_OF_SUCCESS_STRINGS.indexOf(outcome) as ZeroToThree) : null;
            const critRule = game.settings.get("pf2e", "critRule") === "doubledamage" ? "double-damage" : "double-dice";

            const options: DamageRollDataPF2e = {
                rollerId,
                damage: data,
                degreeOfSuccess,
                ignoredResistances: damage.ignoredResistances,
                critRule,
            };
            return new DamageRoll(formula, {}, options).evaluate({ async: true });
        })();

        if (roll === null) return null;

        const noteRollData = context.self?.item?.getRollData();
        const damageNotes = await Promise.all(
            data.notes
                .filter((n) => n.outcome.length === 0 || (outcome && n.outcome.includes(outcome)))
                .map(async (note) => await TextEditor.enrichHTML(note.text, { rollData: noteRollData, async: true }))
        );
        const notes = damageNotes.join("<br />");
        flavor += `${notes}`;

        const { self, target } = context;
        const item = self?.item ?? null;
        const targetFlag = target ? { actor: target.actor.uuid, token: target.token.uuid } : null;

        // Retrieve strike flags. Strikes need refactoring to use ids before we can do better
        const strike = (() => {
            const isStrike = item?.isOfType("melee", "weapon");
            if (isStrike && item && self?.actor?.isOfType("character", "npc")) {
                const strikes: StrikeData[] = self.actor.system.actions;
                const strike = strikes.find(
                    (a): a is StrikeData & { item: ItemPF2e<ActorPF2e> } =>
                        a.item?.id === item.id && a.item.slug === item.slug
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

        const rollMode = context.rollMode ?? "roll";
        const contextFlag: DamageRollContextFlag = {
            type: context.type,
            sourceType: context.sourceType,
            actor: context.self?.actor.id ?? null,
            token: context.self?.token?.id ?? null,
            target: targetFlag,
            domains: context.domains ?? [],
            options: Array.from(context.options).sort(),
            mapIncreases: context.mapIncreases,
            notes: context.notes ?? [],
            secret: context.secret ?? false,
            rollMode,
            traits: context.traits ?? [],
            skipDialog: context.skipDialog ?? !game.user.settings.showRollDialogs,
            outcome,
            unadjustedOutcome: context.unadjustedOutcome ?? null,
        };

        const messageData = await roll.toMessage(
            {
                speaker: ChatMessagePF2e.getSpeaker({ actor: self?.actor, token: self?.token }),
                flavor,
                flags: {
                    core: { canPopout: true },
                    pf2e: {
                        context: contextFlag,
                        target: targetFlag,
                        modifiers: data.modifiers?.map((m) => m.toObject()) ?? [],
                        origin: item?.getOriginData(),
                        strike,
                        preformatted: "both",
                    },
                },
            },
            { create: false }
        );

        // If there is splash damage, include it as an additional roll for separate application
        const splashRolls = await (async (): Promise<RollJSON[]> => {
            const splashInstances = roll.instances
                .map((i) => ({ damageType: i.type, total: i.componentTotal("splash") }))
                .filter((s) => s.total > 0);
            const rolls: RollJSON[] = [];
            for (const splash of splashInstances) {
                const formula = `(${splash.total}[splash])[${splash.damageType}]`;
                const roll = await new DamageRoll(formula).evaluate({ async: true });
                roll.options.splashOnly = true;
                rolls.push(roll.toJSON());
            }

            return rolls;
        })();

        if (context.createMessage) {
            messageData.rolls.push(...splashRolls);
            await ChatMessagePF2e.create(messageData, { rollMode });
        }

        Hooks.callAll(`pf2e.damageRoll`, roll);
        if (callback) callback(roll);

        return roll;
    }
}
