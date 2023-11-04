import type { ActorPF2e } from "@actor";
import { StrikeData } from "@actor/data/base.ts";
import type { ItemPF2e } from "@item";
import { createActionRangeLabel } from "@item/ability/helpers.ts";
import { ChatMessagePF2e, DamageRollContextFlag } from "@module/chat-message/index.ts";
import { ZeroToThree } from "@module/data.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { extractNotes } from "@module/rules/helpers.ts";
import { DEGREE_OF_SUCCESS_STRINGS } from "@system/degree-of-success.ts";
import { createHTMLElement } from "@util";
import { DamageRoll, DamageRollDataPF2e } from "./roll.ts";
import { DamageRollContext, DamageTemplate } from "./types.ts";

/** Create a chat message containing a damage roll */
export class DamagePF2e {
    static async roll(
        data: DamageTemplate,
        context: DamageRollContext,
        callback?: Function,
    ): Promise<Rolled<DamageRoll> | null> {
        const outcome = context.outcome ?? null;

        context.rollMode ??= (context.secret ? "blindroll" : undefined) ?? game.settings.get("core", "rollMode");
        context.createMessage ??= true;

        // Change default roll mode to blind GM roll if the "secret" option is specified
        if (context.options.has("secret")) {
            context.secret = true;
        }

        const subtitle = outcome
            ? context.sourceType === "attack"
                ? game.i18n.localize(`PF2E.Check.Result.Degree.Attack.${outcome}`)
                : game.i18n.localize(`PF2E.Check.Result.Degree.Check.${outcome}`)
            : null;
        let flavor = await renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
            title: data.name,
            subtitle,
        });

        if (data.traits) {
            interface ToTagsParams {
                labels?: Record<string, string | undefined>;
                descriptions?: Record<string, string | undefined>;
                cssClass: string | null;
                dataAttr: string;
            }
            const toTags = (
                slugs: string[],
                { labels = {}, descriptions = {}, cssClass, dataAttr }: ToTagsParams,
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
                        if (description) span.dataset.tooltip = description;
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
                      },
                  )
                : "";

            const runeTags =
                context.options.has("item:rune:property:ghost-touch") && context.options.has("target:trait:incorporeal")
                    ? toTags(["ghost-touch"], {
                          labels: { "ghost-touch": "PF2E.WeaponPropertyRune.ghostTouch.Name" },
                          descriptions: { "ghost-touch": "PF2E.WeaponPropertyRune.ghostTouch.Note" },
                          cssClass: "ghost-touch",
                          dataAttr: "slug",
                      })
                    : "";

            const properties = ((): string => {
                const range = item?.isOfType("action", "melee", "weapon") ? item.range : null;
                const label = createActionRangeLabel(range);
                if (label && (range?.increment || range?.max)) {
                    // Show the range increment or max range as a tag
                    const slug = range.increment ? `range-increment-${range.increment}` : `range-${range.max}`;
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

            const otherTags = [itemTraits, properties, materialEffects, runeTags].join("");

            const tagsElem = createHTMLElement("div", { classes: ["tags"], dataset: { tooltipClass: "pf2e" } });
            tagsElem.innerHTML = otherTags.length > 0 ? `${traits}<hr class="vr" />${otherTags}` : traits;
            flavor += tagsElem.outerHTML;
            flavor += "\n<hr />";
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

        const syntheticNotes = context.self?.actor
            ? extractNotes(context.self?.actor.synthetics.rollNotes, context.domains ?? [])
            : [];
        const contextNotes = context.notes?.map((n) => (n instanceof RollNotePF2e ? n : new RollNotePF2e(n))) ?? [];
        const notes = [...syntheticNotes, ...contextNotes].filter(
            (n) =>
                (n.outcome.length === 0 || (outcome && n.outcome.includes(outcome))) &&
                n.predicate.test(context.options),
        );
        const notesList = RollNotePF2e.notesToHTML(notes);
        flavor += notesList.outerHTML;

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
                        a.item?.id === item.id && a.item.slug === item.slug,
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
            notes: notes.map((n) => n.toObject()),
            secret: context.secret ?? false,
            rollMode,
            traits: context.traits ?? [],
            skipDialog: context.skipDialog ?? !game.user.settings.showDamageDialogs,
            outcome,
            unadjustedOutcome: context.unadjustedOutcome ?? null,
        };

        const messageData: Omit<foundry.documents.ChatMessageSource, "rolls"> & { rolls: (string | RollJSON)[] } =
            await roll.toMessage(
                {
                    speaker: ChatMessagePF2e.getSpeaker({ actor: self?.actor, token: self?.token }),
                    flavor,
                    flags: {
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
                { create: false },
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
