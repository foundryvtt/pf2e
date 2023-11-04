import { ActorPF2e } from "@actor";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { MeasuredTemplatePF2e } from "@module/canvas/index.ts";
import { ChatMessageFlagsPF2e, ChatMessagePF2e } from "@module/chat-message/index.ts";
import { calculateDC } from "@module/dc.ts";
import { MeasuredTemplateDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import { Statistic, StatisticRollParameters } from "@system/statistic/index.ts";
import { ErrorPF2e, getActionGlyph, htmlClosest, htmlQueryAll, sluggify, tupleHasValue } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";
import * as R from "remeda";

const inlineSelector = ["action", "check", "effect-area"].map((keyword) => `[data-pf2-${keyword}]`).join(",");

export const InlineRollLinks = {
    injectRepostElement: (links: HTMLElement[], foundryDoc: ClientDocument | null): void => {
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

            newButton.addEventListener("click", (event) => {
                event.stopPropagation();
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const parent = target?.parentElement;
                if (!parent) return;

                const document = resolveDocument(target, foundryDoc);
                InlineRollLinks.repostAction(parent, document);
            });
        }
    },

    listen: (html: HTMLElement, foundryDoc: ClientDocument | null = null): void => {
        foundryDoc ??= resolveDocument(html, foundryDoc);

        const links = htmlQueryAll(html, inlineSelector).filter((l) => ["A", "SPAN"].includes(l.nodeName));
        InlineRollLinks.injectRepostElement(links, foundryDoc);

        InlineRollLinks.flavorDamageRolls(html, foundryDoc instanceof ActorPF2e ? foundryDoc : null);

        for (const link of links.filter((l) => l.dataset.pf2Action)) {
            const { pf2Action, pf2Glyph, pf2Variant, pf2Dc, pf2ShowDc, pf2Skill } = link.dataset;
            link.addEventListener("click", (event) => {
                const action = game.pf2e.actions[pf2Action ? sluggify(pf2Action, { camel: "dromedary" }) : ""];
                const visibility = pf2ShowDc ?? "all";
                if (pf2Action && action) {
                    action({
                        event,
                        glyph: pf2Glyph,
                        variant: pf2Variant,
                        difficultyClass: pf2Dc ? { scope: "check", value: Number(pf2Dc) || 0, visibility } : undefined,
                        skill: pf2Skill,
                    });
                } else {
                    console.warn(`PF2e System | Skip executing unknown action '${pf2Action}'`);
                }
            });
        }

        for (const link of links.filter((l) => l.dataset.pf2Check && !l.dataset.invalid)) {
            const { pf2Check, pf2Dc, pf2Traits, pf2Label, pf2Defense, pf2Adjustment, pf2Roller, pf2RollOptions } =
                link.dataset;

            if (!pf2Check) return;

            link.addEventListener("click", async (event) => {
                const parent = resolveActor(foundryDoc, link);
                const actors = ((): ActorPF2e[] => {
                    switch (pf2Roller) {
                        case "self":
                            return parent?.canUserModify(game.user, "update") ? [parent] : [];
                        case "party":
                            if (parent?.isOfType("party")) return [parent];
                            return R.compact([game.actors.party]);
                    }

                    // Use the DOM document as a fallback if it's an actor and the check isn't a saving throw
                    const actors = getSelectedOrOwnActors();
                    const isSave = tupleHasValue(SAVE_TYPES, pf2Check);
                    if (parent?.isOfType("party") || (actors.length === 0 && parent && !isSave)) {
                        return [parent];
                    }

                    return actors;
                })();

                if (actors.length === 0) {
                    ui.notifications.warn(game.i18n.localize("PF2E.UI.errorTargetToken"));
                    return;
                }

                const extraRollOptions = [
                    ...(pf2Traits?.split(",").map((o) => o.trim()) ?? []),
                    ...(pf2RollOptions?.split(",").map((o) => o.trim()) ?? []),
                ];
                const eventRollParams = eventToRollParams(event, { type: "check" });

                switch (pf2Check) {
                    case "flat": {
                        for (const actor of actors) {
                            const flatCheck = new Statistic(actor, {
                                label: "",
                                slug: "flat",
                                modifiers: [],
                                check: { type: "flat-check" },
                            });
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? { label: pf2Label, value: Number(pf2Dc) }
                                : null;
                            flatCheck.roll({ ...eventRollParams, extraRollOptions, dc });
                        }
                        break;
                    }
                    default: {
                        const isSavingThrow = tupleHasValue(SAVE_TYPES, pf2Check);

                        // Get actual traits for display in chat cards
                        const traits = isSavingThrow
                            ? []
                            : extraRollOptions.filter((t): t is ActionTrait => t in CONFIG.PF2E.actionTraits) ?? [];

                        for (const actor of actors) {
                            const statistic = ((): Statistic | null => {
                                if (pf2Check in CONFIG.PF2E.magicTraditions) {
                                    const bestSpellcasting =
                                        actor.spellcasting
                                            .filter((c) => c.tradition === pf2Check)
                                            .flatMap((s) => s.statistic ?? [])
                                            .sort((a, b) => b.check.mod - a.check.mod)
                                            .shift() ?? null;
                                    if (bestSpellcasting) return bestSpellcasting;
                                }
                                return actor.getStatistic(pf2Check);
                            })();

                            if (!statistic) {
                                console.warn(ErrorPF2e(`Skip rolling unknown statistic ${pf2Check}`).message);
                                continue;
                            }

                            const targetActor = pf2Defense ? game.user.targets.first()?.actor : null;

                            const dcValue = (() => {
                                const adjustment = Number(pf2Adjustment) || 0;
                                if (pf2Dc === "@self.level") {
                                    return calculateDC(actor.level) + adjustment;
                                }
                                return Number(pf2Dc ?? "NaN") + adjustment;
                            })();

                            const dc = ((): CheckDC | null => {
                                if (Number.isInteger(dcValue)) {
                                    return { label: pf2Label, value: dcValue };
                                } else if (pf2Defense) {
                                    const defenseStat = targetActor?.getStatistic(pf2Defense);
                                    return defenseStat
                                        ? {
                                              statistic: defenseStat.dc,
                                              scope: "check",
                                              value: defenseStat.dc.value,
                                          }
                                        : null;
                                }
                                return null;
                            })();

                            // Retrieve the item if:
                            // (2) The item is an action or,
                            // (1) The check is a saving throw and the item is not a weapon.
                            // Exclude weapons so that roll notes on strikes from incapacitation abilities continue to work.
                            const item = (() => {
                                const itemFromDoc =
                                    foundryDoc instanceof ItemPF2e
                                        ? foundryDoc
                                        : foundryDoc instanceof ChatMessagePF2e
                                        ? foundryDoc.item
                                        : null;

                                return itemFromDoc?.isOfType("action", "feat", "campaignFeature") ||
                                    (isSavingThrow && !itemFromDoc?.isOfType("weapon"))
                                    ? itemFromDoc
                                    : null;
                            })();

                            const args: StatisticRollParameters = {
                                ...eventRollParams,
                                extraRollOptions,
                                origin: isSavingThrow && parent instanceof ActorPF2e ? parent : null,
                                dc,
                                target: !isSavingThrow && dc?.statistic ? targetActor : null,
                                item,
                                traits,
                            };

                            // Use a special header for checks against defenses
                            const itemIsEncounterAction = !!(item?.isOfType("action", "feat") && item.actionCost);
                            if (itemIsEncounterAction && pf2Defense) {
                                const subtitleLocKey =
                                    pf2Check in CONFIG.PF2E.magicTraditions
                                        ? "PF2E.ActionsCheck.spell"
                                        : statistic.check.type === "attack-roll"
                                        ? "PF2E.ActionsCheck.x-attack-roll"
                                        : "PF2E.ActionsCheck.x";
                                args.label = await renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
                                    glyph: getActionGlyph(item.actionCost),
                                    subtitle: game.i18n.format(subtitleLocKey, { type: statistic.label }),
                                    title: item.name,
                                });
                            }

                            statistic.roll(args);
                        }
                    }
                }
            });
        }

        const templateConversion: Record<string, MeasuredTemplateType> = {
            burst: "circle",
            cone: "cone",
            cube: "rect",
            emanation: "circle",
            line: "ray",
            rect: "rect",
            square: "rect",
        } as const;

        for (const link of links.filter((l) => l.hasAttribute("data-pf2-effect-area"))) {
            const { pf2EffectArea, pf2Distance, pf2TemplateData, pf2Traits, pf2Width } = link.dataset;
            link.addEventListener("click", () => {
                if (typeof pf2EffectArea !== "string") {
                    console.warn(`PF2e System | Could not create template'`);
                    return;
                }

                const templateData: DeepPartial<foundry.documents.MeasuredTemplateSource> = JSON.parse(
                    pf2TemplateData ?? "{}",
                );
                templateData.distance ||= Number(pf2Distance);
                templateData.fillColor ||= game.user.color;
                templateData.t = templateConversion[pf2EffectArea];

                switch (templateData.t) {
                    case "ray":
                        templateData.width =
                            Number(pf2Width) ||
                            CONFIG.MeasuredTemplate.defaults.width * (canvas.dimensions?.distance ?? 1);
                        break;
                    case "cone":
                        templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
                        break;
                    case "rect": {
                        const distance = templateData.distance ?? 0;
                        templateData.distance = Math.hypot(distance, distance);
                        templateData.width = distance;
                        templateData.direction = 45;
                        break;
                    }
                }

                if (pf2Traits) {
                    templateData.flags = {
                        pf2e: {
                            origin: {
                                traits: pf2Traits.split(","),
                            },
                        },
                    };
                }

                const templateDoc = new MeasuredTemplateDocumentPF2e(templateData, { parent: canvas.scene });
                new MeasuredTemplatePF2e(templateDoc).drawPreview();
            });
        }
    },

    makeRepostHtml: (target: HTMLElement, defaultVisibility: string): string => {
        const flavor = target.attributes.getNamedItem("data-pf2-repost-flavor")?.value ?? "";
        const showDC = target.attributes.getNamedItem("data-pf2-show-dc")?.value ?? defaultVisibility;
        return `<span data-visibility="${showDC}">${flavor}</span> ${target.outerHTML}`.trim();
    },

    repostAction: (target: HTMLElement, foundryDoc: ClientDocument | null = null): void => {
        if (!["pf2Action", "pf2Check", "pf2EffectArea"].some((d) => d in target.dataset)) {
            return;
        }

        const actor = resolveActor(foundryDoc, target);
        const defaultVisibility = (actor ?? foundryDoc)?.hasPlayerOwner ? "all" : "gm";
        const content = (() => {
            if (target.parentElement?.dataset?.pf2Checkgroup !== undefined) {
                const content = htmlQueryAll(target.parentElement, inlineSelector)
                    .map((target) => InlineRollLinks.makeRepostHtml(target, defaultVisibility))
                    .join("<br>");

                return `<div data-pf2-checkgroup>${content}</div>`;
            } else {
                return InlineRollLinks.makeRepostHtml(target, defaultVisibility);
            }
        })();

        const speaker = actor
            ? ChatMessagePF2e.getSpeaker({ actor, token: actor.getActiveTokens(false, true).shift() })
            : ChatMessagePF2e.getSpeaker();

        // If the originating document is a journal entry, include its UUID as a flag. If a chat message, copy over
        // the origin flag.
        const message = game.messages.get(htmlClosest(target, "[data-message-id]")?.dataset.messageId ?? "");
        const flags: DeepPartial<ChatMessageFlagsPF2e> =
            foundryDoc instanceof JournalEntry
                ? { pf2e: { journalEntry: foundryDoc.uuid } }
                : message?.flags.pf2e.origin
                ? { pf2e: { origin: deepClone(message.flags.pf2e.origin) } }
                : {};

        ChatMessagePF2e.create({
            speaker,
            content,
            flags,
        });
    },

    /** Give inline damage-roll links from items flavor text of the item name */
    flavorDamageRolls(html: HTMLElement, actor: ActorPF2e | null = null): void {
        for (const rollLink of htmlQueryAll(html, "a.inline-roll[data-damage-roll]")) {
            const itemId = htmlClosest(rollLink, "[data-item-id]")?.dataset.itemId;
            const item = actor?.items.get(itemId ?? "");
            if (item) rollLink.dataset.flavor ||= item.name;
        }
    },
};

/** If the provided document exists returns it, otherwise attempt to derive it from the sheet */
function resolveDocument(html: HTMLElement, foundryDoc?: ClientDocument | null): ClientDocument | null {
    if (foundryDoc) return foundryDoc;

    const sheet: { id?: string; document?: unknown } | null =
        ui.windows[Number(html.closest<HTMLElement>(".app.sheet")?.dataset.appid)] ?? null;

    const document = sheet?.document;
    return document instanceof ActorPF2e || document instanceof JournalEntry ? document : null;
}

/** Retrieve an actor via a passed document or item UUID in the dataset of a link */
function resolveActor(foundryDoc: ClientDocument | null, anchor: HTMLElement): ActorPF2e | null {
    if (foundryDoc instanceof ActorPF2e) return foundryDoc;
    if (foundryDoc instanceof ItemPF2e || foundryDoc instanceof ChatMessagePF2e) return foundryDoc.actor;

    // Retrieve item/actor from anywhere via UUID
    const itemUuid = anchor.dataset.itemUuid;
    const itemByUUID = itemUuid && !itemUuid.startsWith("Compendium.") ? fromUuidSync(itemUuid) : null;
    return itemByUUID instanceof ItemPF2e ? itemByUUID.actor : null;
}
