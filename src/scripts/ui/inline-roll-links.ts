import { ActorPF2e, CreaturePF2e } from "@actor";
import { Rollable } from "@actor/data/base";
import { SKILL_EXPANDED } from "@actor/data/values";
import { GhostTemplate } from "@module/ghost-measured-template";
import { PF2CheckDC } from "@system/check-degree-of-success";
import { StatisticBuilder } from "@system/statistic";

function resolveActors(): ActorPF2e[] {
    const actors: ActorPF2e[] = [];
    if (canvas.tokens.controlled.length) {
        actors.push(...(canvas.tokens.controlled.map((token) => token.actor) as ActorPF2e[]));
    } else if (game.user.character) {
        actors.push(game.user.character);
    }
    return actors;
}

const inlineSelector = [
    "action",
    "check",
    "effect-area",
    "flat-check",
    "perception-check",
    "repost",
    "saving-throw",
    "skill-check",
]
    .map((keyword) => `[data-pf2-${keyword}]`)
    .join(",");

export const InlineRollsLinks = {
    // Conditionally show DCs in the text
    injectDCText: ($links: JQuery) => {
        $links.each((_idx, link) => {
            const dc = Number(link.dataset.pf2Dc?.trim() ?? "");
            const role = link.dataset.pf2ShowDc?.trim() ?? "";
            const userCanView = ["all", "owner"].includes(role) || (role === "gm" && game.user.isGM);
            if (!Number.isNaN(dc) && userCanView) {
                const text = link.innerHTML;
                link.innerHTML = game.i18n.format("PF2E.DCWithValue", { dc, text });
            }
        });
    },

    injectRepostElement: ($links: JQuery) => {
        $links.each((_idx, link) => {
            if (game.user.isGM) {
                if (!link.querySelector("[data-pf2-repost]")) {
                    const child = document.createElement("i");
                    child.classList.add("fas");
                    child.classList.add("fa-comment-alt");
                    child.setAttribute("data-pf2-repost", "");
                    child.setAttribute("title", game.i18n.localize("PF2E.Repost"));
                    link.appendChild(child);
                }
            }
        });
    },

    listen: ($html: JQuery): void => {
        const $links = $html.find("span").filter(inlineSelector);
        InlineRollsLinks.injectDCText($links);
        InlineRollsLinks.injectRepostElement($links);
        const $repostLinks = $html.find("i.fas.fa-comment-alt").filter(inlineSelector);

        $repostLinks.filter("[data-pf2-repost]").on("click", (event) => {
            InlineRollsLinks.repostAction(event.target.parentElement!);
            event.stopPropagation();
        });

        $links.filter("[data-pf2-action]").on("click", (event) => {
            const $target = $(event.currentTarget);
            const { pf2Action, pf2Glyph, pf2Variant } = $target[0]?.dataset ?? {};
            const action = game.pf2e.actions[pf2Action ?? ""];
            if (pf2Action && action) {
                action({
                    event,
                    glyph: pf2Glyph,
                    variant: pf2Variant,
                });
            } else {
                console.warn(`PF2e System | Skip executing unknown action '${pf2Action}'`);
            }
        });

        $links.filter("[data-pf2-check]").on("click", (event) => {
            const { pf2Check, pf2Dc, pf2Traits, pf2Label } = event.currentTarget.dataset;
            const actors = resolveActors();

            switch (pf2Check) {
                case "perception": {
                    if (actors.length) {
                        actors.forEach((actor) => {
                            if (actor instanceof CreaturePF2e) {
                                const perceptionCheck = actor.data.data.attributes.perception as Rollable | undefined;
                                if (perceptionCheck) {
                                    const dc: PF2CheckDC | undefined = Number.isInteger(Number(pf2Dc))
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
                    }
                    break;
                }
                case "flat": {
                    if (actors.length) {
                        actors.forEach((actor) => {
                            if (actor instanceof CreaturePF2e) {
                                const flatCheck = StatisticBuilder.from(actor, {
                                    name: "",
                                    modifiers: [],
                                    check: { type: "flat-check" },
                                });
                                if (flatCheck) {
                                    const dc = Number.isInteger(Number(pf2Dc))
                                        ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                        : undefined;
                                    const options = actor.getRollOptions(["all", "flat-check"]);
                                    if (pf2Traits) {
                                        const traits = pf2Traits
                                            .split(",")
                                            .map((trait) => trait.trim())
                                            .filter((trait) => !!trait);
                                        options.push(...traits);
                                    }
                                    flatCheck.check.roll({ event, options, dc, modifiers: [] });
                                } else {
                                    console.warn(`PF2e System | Skip rolling flat check for '${actor}'`);
                                }
                            }
                        });
                    }
                    break;
                }
                case "will":
                case "fortitude":
                case "reflex": {
                    if (actors.length) {
                        actors.forEach((actor) => {
                            const savingThrow = actor.data.data.saves[pf2Check ?? ""] as Rollable | undefined;
                            if (pf2Check && savingThrow) {
                                const dc = Number.isInteger(Number(pf2Dc))
                                    ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                    : undefined;
                                const options = actor.getRollOptions(["all", "saving-throw", pf2Check]);
                                if (pf2Traits) {
                                    const traits = pf2Traits
                                        .split(",")
                                        .map((trait) => trait.trim())
                                        .filter((trait) => !!trait);
                                    options.push(...traits);
                                }
                                savingThrow.roll({ event, options, dc });
                            } else {
                                console.warn(`PF2e System | Skip rolling unknown saving throw '${pf2Check}'`);
                            }
                        });
                    }
                    break;
                }
                default: {
                    const skillActors = actors.filter((actor) => "skills" in actor.data.data);
                    const skill = SKILL_EXPANDED[pf2Check!]?.shortform ?? pf2Check!;
                    for (const actor of skillActors) {
                        const skillCheck = actor.data.data.skills[skill ?? ""] as Rollable | undefined;
                        if (skill && skillCheck) {
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                : undefined;
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

        $links.filter("[data-pf2-saving-throw]").on("click", (event) => {
            console.debug(
                `Deprecation warning | data-pf2-saving-throw is deprecated, use data-pf2-check="savename" instead.`
            );
            const actors = resolveActors();
            if (actors.length) {
                const { pf2SavingThrow, pf2Dc, pf2Traits, pf2Label } = event.currentTarget.dataset ?? {};
                actors.forEach((actor) => {
                    const savingThrow = actor.data.data.saves[pf2SavingThrow ?? ""] as Rollable | undefined;
                    if (pf2SavingThrow && savingThrow) {
                        const dc = Number.isInteger(Number(pf2Dc))
                            ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                            : undefined;
                        const options = actor.getRollOptions(["all", "saving-throw", pf2SavingThrow]);
                        if (pf2Traits) {
                            const traits = pf2Traits
                                .split(",")
                                .map((trait) => trait.trim())
                                .filter((trait) => !!trait);
                            options.push(...traits);
                        }
                        savingThrow.roll({ event, options, dc });
                    } else {
                        console.warn(`PF2e System | Skip rolling unknown saving throw '${pf2SavingThrow}'`);
                    }
                });
            }
        });

        $links.filter("[data-pf2-skill-check]").on("click", (event) => {
            console.debug(
                `Deprecation notice | data-pf2-skill-check is deprecated, use data-pf2-check="skillname" instead.`
            );
            const actors = resolveActors();
            if (actors.length) {
                const { pf2SkillCheck, pf2Dc, pf2Traits, pf2Label } = event.currentTarget.dataset;
                const skill = SKILL_EXPANDED[pf2SkillCheck!]?.shortform ?? pf2SkillCheck!;
                const skillActors = actors.filter((actor) => "skills" in actor.data.data);
                for (const actor of skillActors) {
                    const skillCheck = actor.data.data.skills[skill ?? ""] as Rollable | undefined;
                    if (skill && skillCheck) {
                        const dc = Number.isInteger(Number(pf2Dc))
                            ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                            : undefined;
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
        });

        $links.filter("[data-pf2-perception-check]").on("click", (event) => {
            console.debug(
                `Deprecation warning | data-pf2-perception is deprecated, use data-pf2-check="perception" instead.`
            );
            const actors = resolveActors();
            if (actors.length) {
                const { pf2Dc, pf2Traits, pf2Label } = event.currentTarget.dataset;
                actors.forEach((actor) => {
                    if (actor instanceof CreaturePF2e) {
                        const perceptionCheck = actor.data.data.attributes.perception as Rollable | undefined;
                        if (perceptionCheck) {
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
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
            }
        });

        $links.filter("[data-pf2-flat-check]").on("click", (event) => {
            console.debug(
                `Deprecation warning | data-pf2-flat-check is deprecated, use data-pf2-check="flat" instead.`
            );
            const actors = resolveActors();
            if (actors.length) {
                const { pf2Dc, pf2Traits, pf2Label } = event.currentTarget.dataset;
                actors.forEach((actor) => {
                    if (actor instanceof CreaturePF2e) {
                        const flatCheck = StatisticBuilder.from(actor, {
                            name: "",
                            modifiers: [],
                            check: { type: "flat-check" },
                        });
                        if (flatCheck) {
                            const dc = Number.isInteger(Number(pf2Dc))
                                ? ({ label: pf2Label, value: Number(pf2Dc) } as PF2CheckDC)
                                : undefined;
                            const options = actor.getRollOptions(["all", "flat-check"]);
                            if (pf2Traits) {
                                const traits = pf2Traits
                                    .split(",")
                                    .map((trait) => trait.trim())
                                    .filter((trait) => !!trait);
                                options.push(...traits);
                            }
                            flatCheck.check.roll({ event, options, dc, modifiers: [] });
                        } else {
                            console.warn(`PF2e System | Skip rolling flat check for '${actor}'`);
                        }
                    }
                });
            }
        });

        $links.filter("[data-pf2-effect-area]").on("click", (event) => {
            const { pf2EffectArea, pf2Distance, pf2TemplateData = "{}" } = event.currentTarget.dataset;
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
                    templateData.width ||= 5;
                }
                if (templateData.t === "cone") {
                    templateData.angle ||= 90;
                }

                templateData.fillColor ||= game.user.color;

                const measuredTemplateDoc = new MeasuredTemplateDocument(templateData, { parent: canvas.scene });
                const ghostTemplate = new GhostTemplate(measuredTemplateDoc);
                ghostTemplate.drawPreview();
            } else {
                console.warn(`PF2e System | Could not create template'`);
            }
        });
    },

    repostAction: (target: HTMLElement): void => {
        if (
            target?.matches(
                '[data-pf2-action]:not([data-pf2-action=""]), [data-pf2-action]:not([data-pf2-action=""]) *'
            ) ||
            target?.matches(
                '[data-pf2-saving-throw]:not([data-pf2-saving-throw=""]), [data-pf2-saving-throw]:not([data-pf2-saving-throw=""]) *'
            ) ||
            target?.matches(
                '[data-pf2-skill-check]:not([data-pf2-skill-check=""]), [data-pf2-skill-check]:not([data-pf2-skill-check=""]) *'
            ) ||
            target?.matches("[data-pf2-perception-check], [data-pf2-perception-check] *") ||
            target?.matches("[data-pf2-flat-check], [data-pf2-flat-check] *") ||
            target?.matches("[data-pf2-check], [data-pf2-check] *")
        ) {
            const flavor = target.attributes.getNamedItem("data-pf2-repost-flavor")?.value ?? "";
            target.setAttributeNS(
                null,
                "data-pf2-show-dc",
                target.attributes.getNamedItem("data-pf2-repost-show-dc")?.value ?? "gm"
            );
            const regexDC = new RegExp(game.i18n.localize("PF2E.DCWithValue").replace(/\{.*/gi, "\\d+"));
            const replaced = target.outerHTML
                .replace(regexDC, "")
                .replace(/<[^>]+data-pf2-repost(="")?[^>]*>[^<]*<\s*\/[^>]+>/gi, "");
            ChatMessage.create({ content: `${flavor || ""} ${replaced}`.trim() });
        }
    },
};
