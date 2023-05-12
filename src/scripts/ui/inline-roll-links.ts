import { ActorPF2e } from "@actor";
import { Statistic } from "@system/statistic/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { calculateDC } from "@module/dc.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { htmlClosest, htmlQueryAll, sluggify } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";
import { MeasuredTemplateDocumentPF2e } from "@scene/index.ts";
import { MeasuredTemplatePF2e } from "@module/canvas/index.ts";

const inlineSelector = ["action", "check", "effect-area", "repost"].map((keyword) => `[data-pf2-${keyword}]`).join(",");

export const InlineRollLinks = {
    injectRepostElement: (links: HTMLElement[], foundryDoc?: ClientDocument): void => {
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
            newButton.classList.add("fas", "fa-comment-alt");
            newButton.setAttribute("data-pf2-repost", "");
            newButton.setAttribute("title", game.i18n.localize("PF2E.Repost"));
            link.appendChild(newButton);
        }
    },

    listen: ($html: HTMLElement | JQuery, foundryDoc?: ClientDocument): void => {
        const html = $html instanceof HTMLElement ? $html : $html[0]!;
        if ($html instanceof HTMLElement) $html = $($html);

        const links = htmlQueryAll(html, inlineSelector).filter((l) => l.nodeName === "SPAN");
        InlineRollLinks.injectRepostElement(links, foundryDoc);
        const $repostLinks = $html.find("i.fas.fa-comment-alt").filter(inlineSelector);

        InlineRollLinks.flavorDamageRolls(html, foundryDoc instanceof ActorPF2e ? foundryDoc : null);

        const documentFromDOM = (
            html: HTMLElement
        ): ActorPF2e | JournalEntry | JournalEntryPage<JournalEntry> | null => {
            if (foundryDoc instanceof ChatMessagePF2e) return foundryDoc.actor ?? foundryDoc.journalEntry ?? null;
            if (
                foundryDoc instanceof ActorPF2e ||
                foundryDoc instanceof JournalEntry ||
                foundryDoc instanceof JournalEntryPage
            ) {
                return foundryDoc;
            }

            const sheet: { id?: string; document?: unknown; actor?: unknown; journalEntry?: unknown } | null =
                ui.windows[Number(html.closest<HTMLElement>(".app.sheet")?.dataset.appid)];

            return sheet.document instanceof ActorPF2e || sheet.document instanceof JournalEntry
                ? sheet.document
                : null;
        };

        $repostLinks.filter("i[data-pf2-repost]").on("click", (event) => {
            const target = event.currentTarget;
            const parent = target.parentElement;
            const document = documentFromDOM(target);
            if (parent) InlineRollLinks.repostAction(parent, document);
            event.stopPropagation();
        });

        const $links = $(links);
        $links.filter("[data-pf2-action]").on("click", (event) => {
            const $target = $(event.currentTarget);
            const { pf2Action, pf2Glyph, pf2Variant, pf2Dc, pf2ShowDc, pf2Skill } = $target[0]?.dataset ?? {};
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

        $links.filter("[data-pf2-check]").on("click", (event) => {
            const { pf2Check, pf2Dc, pf2Traits, pf2Label, pf2Adjustment } = event.currentTarget.dataset;
            const actors = getSelectedOrOwnActors();
            if (actors.length === 0) {
                ui.notifications.error(game.i18n.localize("PF2E.UI.errorTargetToken"));
                return;
            }
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
                            slug: "flat-check",
                            modifiers: [],
                            check: { type: "flat-check" },
                            domains: ["flat-check"],
                        });
                        if (flatCheck) {
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? { label: pf2Label, value: Number(pf2Dc) }
                                : null;
                            flatCheck.check.roll({
                                ...eventRollParams,
                                extraRollOptions: parsedTraits,
                                dc,
                            });
                        } else {
                            console.warn(`PF2e System | Skip rolling flat check for "${actor}"`);
                        }
                    }
                    break;
                }
                default: {
                    for (const actor of actors) {
                        const statistic = actor.getStatistic(pf2Check ?? "");
                        if (statistic) {
                            const dcValue = (() => {
                                if (pf2Dc === "@self.level") {
                                    const adjustment = Number(pf2Adjustment) || 0;
                                    return calculateDC(actor.level) + adjustment;
                                }

                                return Number(pf2Dc);
                            })();

                            const dc = Number.isInteger(dcValue) ? { label: pf2Label, value: dcValue } : null;
                            statistic.check.roll({
                                ...eventRollParams,
                                extraRollOptions: parsedTraits,
                                origin: document instanceof ActorPF2e ? document : null,
                                dc,
                            });
                        } else {
                            console.warn(`PF2e System | Skip rolling unknown statistic ${pf2Check}`);
                        }
                    }
                }
            }
        });

        $links.filter("[data-pf2-effect-area]").on("click", async (event) => {
            const { pf2EffectArea, pf2Distance, pf2TemplateData, pf2Traits, pf2Width } = event.currentTarget.dataset;
            const templateConversion: Record<string, MeasuredTemplateType> = {
                burst: "circle",
                emanation: "circle",
                line: "ray",
                cone: "cone",
                rect: "rect",
            } as const;

            if (typeof pf2EffectArea === "string") {
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
                await new MeasuredTemplatePF2e(templateDoc).drawPreview();
            } else {
                console.warn(`PF2e System | Could not create template'`);
            }
        });
    },

    repostAction: (
        target: HTMLElement,
        document: ActorPF2e | JournalEntry | JournalEntryPage<JournalEntry> | null = null
    ): void => {
        if (!["pf2Action", "pf2Check", "pf2EffectArea"].some((d) => d in target.dataset)) {
            return;
        }

        const flavor = target.attributes.getNamedItem("data-pf2-repost-flavor")?.value ?? "";
        const showDC =
            target.attributes.getNamedItem("data-pf2-show-dc")?.value ?? (document?.hasPlayerOwner ? "all" : "gm");
        const speaker =
            document instanceof ActorPF2e
                ? ChatMessagePF2e.getSpeaker({
                      actor: document,
                      token: document.token ?? document.getActiveTokens(false, true).shift(),
                  })
                : ChatMessagePF2e.getSpeaker();

        // If the originating document is a journal entry, include its UUID as a flag
        const flags = document instanceof JournalEntry ? { pf2e: { journalEntry: document.uuid } } : {};

        ChatMessagePF2e.create({
            speaker,
            content: `<span data-visibility="${showDC}">${flavor}</span> ${target.outerHTML}`.trim(),
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
