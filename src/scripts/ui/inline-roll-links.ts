import { ActorPF2e, CreaturePF2e } from "@actor";
import { Rollable } from "@actor/data/base";
import { SKILL_EXPANDED } from "@actor/data/values";
import { GhostTemplate } from "@module/canvas/ghost-measured-template";
import { CheckDC } from "@system/degree-of-success";
import { Statistic } from "@system/statistic";
import { ChatMessagePF2e } from "@module/chat-message";
import { calculateDC } from "@module/dc";
import { eventToRollParams } from "@scripts/sheet-util";
import { sluggify } from "@util";
import { getSelectedOrOwnActors } from "@util/token-actor-utils";

const inlineSelector = ["action", "check", "effect-area", "repost"].map((keyword) => `[data-pf2-${keyword}]`).join(",");

export const InlineRollLinks = {
    injectRepostElement: ($links: JQuery): void => {
        for (const link of $links) {
            if (link.querySelector("i[data-pf2-repost]")) {
                link.classList.add("with-repost");
                continue;
            }

            if (!game.user.isGM) continue;

            link.classList.add("with-repost");
            const child = document.createElement("i");
            child.classList.add("fas", "fa-comment-alt");
            child.setAttribute("data-pf2-repost", "");
            child.setAttribute("title", game.i18n.localize("PF2E.Repost"));
            link.appendChild(child);
        }
    },

    listen: ($html: JQuery): void => {
        const $links = $html.find("span").filter(inlineSelector);
        InlineRollLinks.injectRepostElement($links);
        const $repostLinks = $html.find("i.fas.fa-comment-alt").filter(inlineSelector);

        const documentFromDOM = (html: HTMLElement): ActorPF2e | JournalEntry | null => {
            const sheet: { id?: string; document?: unknown; actor?: unknown; journalEntry?: unknown } | null =
                ui.windows[Number(html.closest<HTMLElement>(".app.sheet")?.dataset.appid)];
            const sheetOrMessage =
                sheet ?? game.messages.get(html.closest<HTMLElement>("li.chat-message")?.dataset.messageId ?? "") ?? {};
            const document = sheetOrMessage.document ?? sheetOrMessage.actor ?? sheetOrMessage.journalEntry;

            return document instanceof ActorPF2e || document instanceof JournalEntry ? document : null;
        };

        $repostLinks.filter("i[data-pf2-repost]").on("click", (event) => {
            const target = event.currentTarget;
            const parent = target.parentElement;
            const document = documentFromDOM(target);
            if (parent) InlineRollLinks.repostAction(parent, document);
            event.stopPropagation();
        });

        $links.filter("[data-pf2-action]").on("click", (event) => {
            const $target = $(event.currentTarget);
            const { pf2Action, pf2Glyph, pf2Variant, pf2Dc, pf2ShowDc } = $target[0]?.dataset ?? {};
            const action = game.pf2e.actions[pf2Action ? sluggify(pf2Action, { camel: "dromedary" }) : ""];
            const visibility = pf2ShowDc ?? "all";
            if (pf2Action && action) {
                action({
                    event,
                    glyph: pf2Glyph,
                    variant: pf2Variant,
                    difficultyClass: pf2Dc ? { scope: "check", value: Number(pf2Dc) || 0, visibility } : undefined,
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

            const eventRollParams = eventToRollParams(event);

            switch (pf2Check) {
                case "perception": {
                    actors.forEach((actor) => {
                        if (actor instanceof CreaturePF2e) {
                            const perceptionCheck = actor.data.data.attributes.perception as Rollable | undefined;
                            if (perceptionCheck) {
                                const dc: CheckDC | undefined = Number.isInteger(Number(pf2Dc))
                                    ? { label: pf2Label, value: Number(pf2Dc) }
                                    : undefined;
                                const options = actor.getRollOptions(["all", "perception"]);
                                if (pf2Traits) {
                                    const traits = pf2Traits
                                        .split(",")
                                        .map((trait) => trait.trim())
                                        .filter((trait) => !!trait);
                                    options.push(...traits);
                                }
                                perceptionCheck.roll({ event, options, dc });
                            } else {
                                console.warn(`PF2e System | Skip rolling perception for '${actor}'`);
                            }
                        }
                    });
                    break;
                }
                case "flat": {
                    actors.forEach((actor) => {
                        if (actor instanceof CreaturePF2e) {
                            const flatCheck = new Statistic(actor, {
                                label: "",
                                slug: "flat-check",
                                modifiers: [],
                                check: { type: "flat-check" },
                            });
                            if (flatCheck) {
                                const dc = Number.isInteger(Number(pf2Dc))
                                    ? ({ label: pf2Label, value: Number(pf2Dc) } as CheckDC)
                                    : undefined;
                                const options = actor.getRollOptions(["all", "flat-check"]);
                                if (pf2Traits) {
                                    const traits = pf2Traits
                                        .split(",")
                                        .map((trait) => trait.trim())
                                        .filter((trait) => !!trait);
                                    options.push(...traits);
                                }
                                flatCheck.check.roll({ ...eventRollParams, extraRollOptions: options, dc });
                            } else {
                                console.warn(`PF2e System | Skip rolling flat check for '${actor}'`);
                            }
                        }
                    });
                    break;
                }
                case "will":
                case "fortitude":
                case "reflex": {
                    actors.forEach((actor) => {
                        const savingThrow = actor.saves?.[pf2Check ?? ""];
                        if (pf2Check && savingThrow) {
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? { label: pf2Label, value: Number(pf2Dc) }
                                : null;
                            const options = actor.getRollOptions(["all", "saving-throw", pf2Check]);
                            if (pf2Traits) {
                                const traits = pf2Traits
                                    .split(",")
                                    .map((trait) => trait.trim())
                                    .filter((trait) => !!trait);
                                options.push(...traits);
                            }
                            savingThrow.check.roll({ ...eventToRollParams(event), extraRollOptions: options, dc });
                        } else {
                            console.warn(`PF2e System | Skip rolling unknown saving throw '${pf2Check}'`);
                        }
                    });
                    break;
                }
                default: {
                    const skillActors = actors.filter((actor): actor is CreaturePF2e => "skills" in actor.data.data);
                    const skill = SKILL_EXPANDED[pf2Check!]?.shortform ?? pf2Check!;
                    for (const actor of skillActors) {
                        const skillCheck = actor.data.data.skills[skill ?? ""];
                        if (skill && skillCheck) {
                            const dcValue =
                                pf2Dc === "@self.level"
                                    ? ((): number => {
                                          const pwlSetting = game.settings.get("pf2e", "proficiencyVariant");
                                          const proficiencyWithoutLevel = pwlSetting === "ProficiencyWithoutLevel";
                                          const level = actor.level;
                                          const adjustment = Number(pf2Adjustment) || 0;
                                          return calculateDC(level, { proficiencyWithoutLevel }) + adjustment;
                                      })()
                                    : Number(pf2Dc);
                            const dc = dcValue > 0 ? { label: pf2Label, value: dcValue } : null;
                            const options = actor.getRollOptions(["all", "skill-check", skill]);
                            if (pf2Traits) {
                                const traits = pf2Traits
                                    .split(",")
                                    .map((trait) => trait.trim())
                                    .filter((trait) => !!trait);
                                options.push(...traits);
                            }
                            skillCheck.roll({ event, options, dc });
                        } else {
                            console.warn(`PF2e System | Skip rolling unknown skill check or untrained lore '${skill}'`);
                        }
                    }
                }
            }
        });

        $links.filter("[data-pf2-effect-area]").on("click", async (event) => {
            const {
                pf2EffectArea,
                pf2Distance,
                pf2TemplateData = "{}",
                pf2Traits,
                pf2Width,
            } = event.currentTarget.dataset;
            const templateConversion: Record<string, string> = {
                burst: "circle",
                emanation: "circle",
                line: "ray",
                cone: "cone",
                rect: "rect",
            };

            if (typeof pf2EffectArea === "string") {
                const templateData = JSON.parse(pf2TemplateData);
                templateData.t = templateConversion[pf2EffectArea];
                templateData.user = game.user.id;

                templateData.distance ||= Number(pf2Distance);

                if (templateData.t === "ray") {
                    templateData.width ||= pf2Width ? Number(pf2Width) : canvas.dimensions?.distance ?? 0;
                }
                if (templateData.t === "cone") {
                    templateData.angle ||= 90;
                }

                templateData.fillColor ||= game.user.color;

                if (pf2Traits) {
                    templateData.flags = {
                        pf2e: {
                            origin: {
                                traits: pf2Traits.split(","),
                            },
                        },
                    };
                }

                const templateDoc = new MeasuredTemplateDocument(templateData, { parent: canvas.scene });
                const ghostTemplate = new GhostTemplate(templateDoc);
                await ghostTemplate.drawPreview();
            } else {
                console.warn(`PF2e System | Could not create template'`);
            }
        });
    },

    repostAction: (target: HTMLElement, document: ActorPF2e | JournalEntry | null = null): void => {
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
};
