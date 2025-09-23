import { ActorPF2e } from "@actor";
import { Modifier } from "@actor/modifiers.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import type { ClientDocument } from "@client/documents/abstract/client-document.d.mts";
import type { MeasuredTemplateType } from "@common/constants.d.mts";
import { ItemPF2e } from "@item";
import type { AbilityTrait } from "@item/ability/types.ts";
import { EFFECT_AREA_SHAPES } from "@item/spell/values.ts";
import { ChatMessageFlagsPF2e, ChatMessagePF2e } from "@module/chat-message/index.ts";
import { calculateDC } from "@module/dc.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { resolveActorAndItemFromHTML, resolveSheetDocument } from "@scripts/helpers.ts";
import type { CheckDC } from "@system/degree-of-success.ts";
import { Statistic, StatisticRollParameters } from "@system/statistic/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, getActionGlyph, htmlClosest, htmlQueryAll, sluggify, splitListString, tupleHasValue } from "@util";
import { getSelectedActors } from "@util/token-actor-utils.ts";
import * as R from "remeda";

const inlineSelector = ["action", "check", "effect-area"].map((keyword) => `[data-pf2-${keyword}]`).join(",");

export class InlineRollLinks {
    static activatePF2eListeners(): void {
        document.addEventListener(
            "click",
            (event) => {
                const getLinkOrSpan = (attr: string) =>
                    htmlClosest<HTMLAnchorElement | HTMLSpanElement>(event.target, `a[${attr}], span[${attr}]`);

                // Handle repost (before everything else)
                const repostLink = htmlClosest(event.target, "i[data-pf2-repost]");
                if (repostLink) {
                    const link = htmlClosest(repostLink, "a, span");
                    if (link) {
                        this.#onRepostAction(link);
                    }
                    return;
                }

                // Handle inline check
                const checkLink = getLinkOrSpan("data-pf2-check");
                if (checkLink) {
                    this.#onClickInlineCheck(event, checkLink);
                    return;
                }

                const actionLink = getLinkOrSpan("data-pf2-action");
                if (actionLink) {
                    this.#onClickInlineAction(event, actionLink);
                    return;
                }

                const areaLink = getLinkOrSpan("data-pf2-effect-area");
                if (areaLink) {
                    this.#onClickInlineTemplate(event, areaLink);
                    return;
                }
            },
            { passive: true },
        );
    }

    static injectRepostElements(html: HTMLElement, foundryDoc: ClientDocument | null): void {
        const links = htmlQueryAll(html, inlineSelector).filter((l) => ["A", "SPAN"].includes(l.nodeName));
        foundryDoc ??= resolveSheetDocument(html);
        for (const link of links) {
            if (!foundryDoc || foundryDoc.isOwner) link.classList.add("with-repost");

            const repostButtons = htmlQueryAll(link, "i[data-pf2-repost]");
            if (repostButtons.length > 0) {
                if (foundryDoc && !foundryDoc.isOwner) {
                    for (const button of repostButtons) {
                        button.remove();
                    }
                    link.classList.remove("with-repost");
                }
                continue;
            }

            if (foundryDoc && !foundryDoc.isOwner) continue;

            const newButton = document.createElement("i");
            const icon =
                link.parentElement?.dataset?.pf2Checkgroup !== undefined ? "fa-comment-alt-dots" : "fa-comment-alt";
            newButton.classList.add("fa-solid", icon);
            newButton.dataset.pf2Repost = "";
            newButton.title = game.i18n.localize("PF2E.Repost");
            link.appendChild(newButton);
        }
    }

    static #makeRepostHtml(target: HTMLElement, defaultVisibility: string): string {
        const flavor = game.i18n.localize(target.dataset.pf2RepostFlavor ?? "");
        const showDC = target.dataset.pf2ShowDc ?? defaultVisibility;
        return (flavor ? `<span data-visibility="${showDC}">${flavor}</span> ` : "") + `${target.outerHTML}`.trim();
    }

    static #onClickInlineAction(event: PointerEvent, link: HTMLAnchorElement | HTMLSpanElement): void {
        const { pf2Action, pf2Glyph, pf2Variant, pf2Dc, pf2ShowDc, pf2Skill, pf2Options, pf2Traits } = link.dataset;

        const slug = sluggify(pf2Action ?? "");
        const visibility = pf2ShowDc ?? "all";
        const difficultyClass = Number.isNumeric(pf2Dc)
            ? { scope: "check", value: Number(pf2Dc) || 0, visibility }
            : pf2Dc;
        const maybeTraits = splitListString(pf2Traits ?? "");
        const traits = maybeTraits.filter((trait): trait is AbilityTrait => trait in CONFIG.PF2E.actionTraits);
        const rollOptions = R.unique(
            [maybeTraits, traits.map((trait) => `item:trait:${trait}`), splitListString(pf2Options ?? "")].flat(),
        );
        if (slug && game.pf2e.actions.has(slug)) {
            game.pf2e.actions
                .get(slug)
                ?.use({ event, variant: pf2Variant, difficultyClass, rollOptions, statistic: pf2Skill, traits })
                .catch((reason: string) => ui.notifications.warn(reason));
        } else {
            const action = game.pf2e.actions[pf2Action ? sluggify(pf2Action, { camel: "dromedary" }) : ""];
            if (pf2Action && action) {
                action({
                    event,
                    glyph: pf2Glyph,
                    variant: pf2Variant,
                    difficultyClass,
                    rollOptions,
                    skill: pf2Skill,
                    traits,
                });
            } else {
                console.warn(`PF2e System | Skip executing unknown action '${pf2Action}'`);
            }
        }
    }

    static async #onClickInlineCheck(event: PointerEvent, link: HTMLAnchorElement | HTMLSpanElement): Promise<void> {
        const { pf2Check, pf2Dc, pf2Traits, pf2Label, pf2Adjustment, pf2Roller, pf2RollOptions } = link.dataset;
        const against = link.dataset.against || link.dataset.pf2Defense; // pf2Defense is only checked for backwards compat
        const overrideTraits = "overrideTraits" in link.dataset;
        const targetOwner = "targetOwner" in link.dataset;

        if (!pf2Check) return;

        const { actor: parentActor, item: itemFromDoc, sheetActor } = resolveActorAndItemFromHTML(link);
        const actors = ((): ActorPF2e[] => {
            switch (pf2Roller) {
                case "self":
                    return parentActor?.canUserModify(game.user, "update") ? [parentActor] : [];
                case "party":
                    if (parentActor?.isOfType("party")) return [parentActor];
                    return [game.actors.party ?? []].flat();
            }

            // If this is inside a sheet, return the actor always
            if (sheetActor && !sheetActor.isOfType("loot", "party") && sheetActor.isOwner) {
                return [sheetActor];
            }

            // If the rolling actor is a party actor, return it (likely kingmaker)
            if (parentActor?.isOfType("party")) {
                return [parentActor];
            }

            // Get selected actors, but fallback to parent if its not a save
            const rollingActors = getSelectedActors({ exclude: ["loot"], assignedFallback: true });
            const isSave = tupleHasValue(SAVE_TYPES, pf2Check);
            if (rollingActors.length === 0 && parentActor && !isSave) {
                return [parentActor];
            }

            return rollingActors;
        })();

        if (actors.length === 0) {
            ui.notifications.error("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
            return;
        }

        const maybeTraits = splitListString(pf2Traits ?? "");
        const additionalTraits = maybeTraits.filter((t): t is AbilityTrait => t in CONFIG.PF2E.actionTraits);

        const extraRollOptions = R.unique(
            [maybeTraits, additionalTraits.map((t) => `item:trait:${t}`), splitListString(pf2RollOptions ?? "")].flat(),
        );
        const eventRollParams = eventToRollParams(event, { type: "check" });
        const checkSlug = link.dataset.slug ? sluggify(link.dataset.slug) : null;

        // If it is a flat check, perform a simpler roll per actor and return
        if (pf2Check === "flat") {
            for (const actor of actors) {
                const flatCheck = new Statistic(actor, {
                    label: "",
                    slug: "flat",
                    modifiers: [],
                    check: { type: "flat-check" },
                });
                const dc = Number.isInteger(Number(pf2Dc)) ? { label: pf2Label, value: Number(pf2Dc) } : null;
                flatCheck.roll({ ...eventRollParams, slug: checkSlug, extraRollOptions, dc });
            }
            return;
        }

        const isSavingThrow = tupleHasValue(SAVE_TYPES, pf2Check);

        // Get actual traits for display in chat cards
        const abilityTraits = isSavingThrow
            ? []
            : extraRollOptions.filter((t): t is AbilityTrait => t in CONFIG.PF2E.actionTraits);

        // Pre-emptively grab statistics to visibly error if the statistic is missing from all of them
        const actorStatistics = actors.map((actor) => {
            const relatedItem = itemFromDoc?.actor?.uuid === actor.uuid ? itemFromDoc : null;
            return { actor, statistic: actor.getStatistic(pf2Check, { item: relatedItem }) };
        });
        if (!actorStatistics.some(({ statistic }) => !!statistic)) {
            ui.notifications.error(
                game.i18n.format("PF2E.ErrorMessage.MissingStatisticSelected", { statistic: pf2Check }),
            );
            return;
        }

        for (const { actor: rollingActor, statistic } of actorStatistics) {
            if (!statistic) {
                console.warn(
                    ErrorPF2e(`Skip rolling unknown statistic ${pf2Check} for actor ${rollingActor.name}`).message,
                );
                continue;
            }

            // Determine if this actor is the origin/target. Currently we only guess based on if its a save
            const rollerRole = tupleHasValue(["origin", "target"], link.dataset.rollerRole)
                ? link.dataset.rollerRole
                : isSavingThrow
                  ? "target"
                  : "origin";
            const opposingRole = rollerRole === "target" ? "origin" : "target";
            const targetActor =
                against && rollerRole === "target"
                    ? rollingActor
                    : targetOwner
                      ? parentActor
                      : (game.user.targets.first()?.actor ?? null);
            const opposingActor = rollerRole === "target" ? parentActor : targetActor;
            const originActor = rollerRole === "origin" ? rollingActor : parentActor;

            // Retrieve the item if:
            // (2) The item is an action or,
            // (1) The check is a saving throw and the item is not a weapon.
            // Exclude weapons so that roll notes on strikes from incapacitation abilities continue to work.
            const item =
                itemFromDoc?.actor &&
                (itemFromDoc.isOfType("action", "feat", "campaignFeature") ||
                    (isSavingThrow && !itemFromDoc?.isOfType("weapon")))
                    ? (itemFromDoc as ItemPF2e<ActorPF2e>)
                    : null;

            const dc = ((): CheckDC | null => {
                const dcValue = pf2Dc === "@self.level" ? calculateDC(rollingActor.level) : Number(pf2Dc ?? "NaN");
                const adjustment = Number(pf2Adjustment) || 0;

                if (Number.isInteger(dcValue)) {
                    return { label: pf2Label, value: dcValue + adjustment };
                } else if (against) {
                    const defenseStat = opposingActor?.getStatistic(against)?.clone({
                        modifiers: adjustment
                            ? [new Modifier({ label: "PF2E.InlineCheck.DCAdjustment", modifier: adjustment })]
                            : [],
                        rollOptions: [
                            item?.isOfType("action", "feat") ? `${opposingRole}:action:slug:${item.slug}` : null,
                        ].filter(R.isTruthy),
                    });
                    if (defenseStat) {
                        return {
                            label:
                                defenseStat.dc.label ??
                                game.i18n.format("PF2E.InlineCheck.DCWithName", { name: defenseStat.label }),
                            statistic: defenseStat.dc,
                            scope: "check",
                            value: defenseStat.dc.value,
                        };
                    }
                }

                return null;
            })();

            const args: StatisticRollParameters = {
                ...eventRollParams,
                extraRollOptions,
                origin: originActor,
                dc,
                target: dc?.statistic ? targetActor : null,
                item,
                traits: abilityTraits,
            };

            // Use a special header for checks against defenses
            const itemIsEncounterAction =
                !overrideTraits && rollerRole === "origin" && !!(item?.isOfType("action", "feat") && item.actionCost);
            if (itemIsEncounterAction) {
                const subtitleLocKey =
                    pf2Check in CONFIG.PF2E.magicTraditions
                        ? "PF2E.ActionsCheck.spell"
                        : statistic.check.type === "attack-roll"
                          ? "PF2E.ActionsCheck.x-attack-roll"
                          : "PF2E.ActionsCheck.x";
                args.label = await fa.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
                    glyph: getActionGlyph(item.actionCost),
                    subtitle: game.i18n.format(subtitleLocKey, { type: statistic.label }),
                    title: item.name,
                });
                extraRollOptions.push(...TextEditorPF2e.createActionOptions(item));
            }

            statistic.roll(args);
        }
    }

    static #onClickInlineTemplate(_event: PointerEvent, link: HTMLAnchorElement | HTMLSpanElement): void {
        if (!canvas.ready) return;

        const templateConversion: Record<string, MeasuredTemplateType> = {
            burst: "circle",
            cone: "cone",
            cube: "rect",
            emanation: "circle",
            line: "ray",
            rect: "rect",
            square: "rect",
        } as const;

        const { pf2EffectArea, pf2Distance, pf2TemplateData, pf2Traits, pf2Width } = link.dataset;

        if (typeof pf2EffectArea !== "string") {
            console.warn(`PF2e System | Could not create template'`);
            return;
        }

        const { actor, item, message } = resolveActorAndItemFromHTML(link);
        const data: DeepPartial<foundry.documents.MeasuredTemplateSource> = JSON.parse(pf2TemplateData ?? "{}");
        data.distance ||= Number(pf2Distance);
        data.fillColor ||= game.user.color.toString();
        data.t = templateConversion[pf2EffectArea];

        switch (data.t) {
            case "ray":
                data.width = Number(pf2Width) || CONFIG.MeasuredTemplate.defaults.width * canvas.dimensions.distance;
                break;
            case "cone":
                data.angle ||= CONFIG.MeasuredTemplate.defaults.angle;
                break;
            case "rect": {
                const distance = data.distance ?? 0;
                data.distance = Math.hypot(distance, distance);
                data.width = distance;
                data.direction = 45;
                break;
            }
        }

        const flags: { pf2e: Record<string, JSONValue> } = { pf2e: {} };

        const normalSize = (Math.ceil(data.distance) / 5) * 5 || 5;
        if (tupleHasValue(EFFECT_AREA_SHAPES, pf2EffectArea) && data.distance === normalSize) {
            flags.pf2e.areaShape = pf2EffectArea;
        }

        if (message) {
            flags.pf2e.messageId = message.id;
        }

        if (item) {
            const origin = item.getOriginData();
            flags.pf2e.origin = origin;
        } else if (actor || pf2Traits) {
            flags.pf2e.origin = {
                actor: actor?.uuid ?? null,
                traits: splitListString(pf2Traits ?? ""),
            };
        }

        if (!R.isEmpty(flags.pf2e)) {
            data.flags = flags;
        }

        canvas.templates.createPreview(data);
    }

    static async #onRepostAction(target: HTMLElement): Promise<ChatMessagePF2e | undefined> {
        if (!["pf2Action", "pf2Check", "pf2EffectArea"].some((d) => d in target.dataset)) {
            return;
        }

        const { actor, appDocument } = resolveActorAndItemFromHTML(target);
        const defaultVisibility = (actor ?? appDocument)?.hasPlayerOwner ? "all" : "gm";
        const content = (() => {
            if (target.parentElement?.dataset?.pf2Checkgroup !== undefined) {
                const content = htmlQueryAll(target.parentElement, inlineSelector)
                    .map((target) => this.#makeRepostHtml(target, defaultVisibility))
                    .join("<br>");

                return `<div data-pf2-checkgroup>${content}</div>`;
            } else {
                return this.#makeRepostHtml(target, defaultVisibility);
            }
        })();

        const speaker = actor
            ? ChatMessagePF2e.getSpeaker({ actor, token: actor.getActiveTokens(true, true).shift() })
            : ChatMessagePF2e.getSpeaker();

        // If the originating document is a journal entry, include its UUID as a flag. If a chat message, copy over
        // the origin flag.
        const message = game.messages.get(htmlClosest(target, "[data-message-id]")?.dataset.messageId ?? "");
        const flags: DeepPartial<ChatMessageFlagsPF2e> =
            appDocument instanceof JournalEntry
                ? { pf2e: { journalEntry: appDocument.uuid } }
                : message?.flags.pf2e.origin
                  ? { pf2e: { origin: fu.deepClone(message.flags.pf2e.origin) } }
                  : {};

        return ChatMessagePF2e.create({ speaker, content, flags });
    }

    /** Give inline damage-roll links from items flavor text of the item name */
    static flavorDamageRolls(html: HTMLElement, document: ClientDocument | null = null): void {
        const actor = resolveActor(document ?? resolveActorAndItemFromHTML(html).actor);
        for (const rollLink of htmlQueryAll(html, "a.inline-roll[data-damage-roll]")) {
            const itemId = htmlClosest(rollLink, "[data-item-id]")?.dataset.itemId;
            const item = actor?.items.get(itemId ?? "");
            if (item) rollLink.dataset.flavor ||= item.name;
        }
    }
}

/** Retrieve an actor via a passed document. Handles item owners and chat message actors. */
function resolveActor(foundryDoc: ClientDocument | null): ActorPF2e | null {
    if (foundryDoc instanceof ActorPF2e) return foundryDoc;
    if (foundryDoc instanceof ItemPF2e || foundryDoc instanceof ChatMessagePF2e) return foundryDoc.actor;
    return null;
}
