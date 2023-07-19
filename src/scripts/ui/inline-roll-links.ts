import { ActorPF2e } from "@actor";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemPF2e } from "@item";
import { MeasuredTemplatePF2e } from "@module/canvas/index.ts";
import { ChatMessageFlagsPF2e, ChatMessagePF2e } from "@module/chat-message/index.ts";
import { calculateDC } from "@module/dc.ts";
import { MeasuredTemplateDocumentPF2e } from "@scene/index.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import { Statistic } from "@system/statistic/index.ts";
import { htmlClosest, htmlQueryAll, sluggify, tupleHasValue } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";

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

    listen: ($html: HTMLElement | JQuery, foundryDoc: ClientDocument | null = null): void => {
        const html = $html instanceof HTMLElement ? $html : $html[0]!;
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
            const { pf2Check, pf2Dc, pf2Traits, pf2Label, pf2Defense, pf2Adjustment, pf2Roller } = link.dataset;
            link.addEventListener("click", (event) => {
                const parent = resolveActor(foundryDoc);
                const actors = (() => {
                    if (pf2Roller === "self") {
                        const validActor = parent instanceof ActorPF2e && parent.canUserModify(game.user, "update");
                        if (!validActor) {
                            ui.notifications.warn(game.i18n.localize("PF2E.UI.warnNoActor"));
                        }
                        return validActor ? [parent] : [];
                    }

                    const actors = getSelectedOrOwnActors();
                    if (actors.length === 0) {
                        // Use the DOM document as a fallback if it's an actor and the check isn't a saving throw
                        if (parent instanceof ActorPF2e && !tupleHasValue(SAVE_TYPES, pf2Check)) {
                            return [parent];
                        }
                        ui.notifications.warn(game.i18n.localize("PF2E.UI.errorTargetToken"));
                    }
                    return actors;
                })();

                if (actors.length === 0) return;

                const parsedTraits = pf2Traits
                    ?.split(",")
                    .map((trait) => trait.trim())
                    .filter((trait) => !!trait);
                const eventRollParams = eventToRollParams(event);

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
                            flatCheck.roll({ ...eventRollParams, extraRollOptions: parsedTraits, dc });
                        }
                        break;
                    }
                    default: {
                        for (const actor of actors) {
                            const statistic = actor.getStatistic(pf2Check ?? "");
                            if (!statistic) {
                                console.warn(`PF2e System | Skip rolling unknown statistic ${pf2Check}`);
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

                            // Retrieve the item if it is not a weapon and this is a saving throw
                            // Exclude weapons so that roll notes on strikes from incapacitation abilities continue to work.
                            const item = (() => {
                                if (!tupleHasValue(SAVE_TYPES, statistic.slug)) return null;
                                return foundryDoc instanceof ItemPF2e && !foundryDoc.isOfType("weapon")
                                    ? foundryDoc
                                    : foundryDoc instanceof ChatMessagePF2e && !foundryDoc.item?.isOfType("weapon")
                                    ? foundryDoc.item
                                    : null;
                            })();
                            const isSavingThrow = tupleHasValue(SAVE_TYPES, pf2Check);

                            statistic.roll({
                                ...eventRollParams,
                                extraRollOptions: parsedTraits,
                                origin: isSavingThrow && parent instanceof ActorPF2e ? parent : null,
                                dc,
                                target: !isSavingThrow && dc?.statistic ? targetActor : null,
                                item,
                            });
                        }
                    }
                }
            });
        }

        const templateConversion: Record<string, MeasuredTemplateType> = {
            burst: "circle",
            emanation: "circle",
            line: "ray",
            cone: "cone",
            rect: "rect",
        } as const;

        for (const link of links.filter((l) => l.hasAttribute("data-pf2-effect-area"))) {
            const { pf2EffectArea, pf2Distance, pf2TemplateData, pf2Traits, pf2Width } = link.dataset;
            link.addEventListener("click", () => {
                if (typeof pf2EffectArea !== "string") {
                    console.warn(`PF2e System | Could not create template'`);
                    return;
                }

                const templateData: DeepPartial<foundry.documents.MeasuredTemplateSource> = JSON.parse(
                    pf2TemplateData ?? "{}"
                );
                templateData.distance ||= Number(pf2Distance);
                templateData.fillColor ||= game.user.color;
                templateData.t = templateConversion[pf2EffectArea];

                if (templateData.t === "ray") {
                    templateData.width =
                        Number(pf2Width) || CONFIG.MeasuredTemplate.defaults.width * (canvas.dimensions?.distance ?? 1);
                } else if (templateData.t === "cone") {
                    templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
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

        const actor = resolveActor(foundryDoc);
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

/** Retrieves the actor for the given document, or the document itself if its already an actor */
function resolveActor(foundryDoc: ClientDocument | null): ActorPF2e | null {
    if (foundryDoc instanceof ActorPF2e) return foundryDoc;
    if (foundryDoc instanceof ItemPF2e || foundryDoc instanceof ChatMessagePF2e) return foundryDoc.actor;
    return null;
}
