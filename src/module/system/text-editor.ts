import { ActorPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/values.ts";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import { ItemSystemData } from "@item/data/base.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { UserVisibility, UserVisibilityPF2e } from "@scripts/ui/user-visibility.ts";
import { createHTMLElement, htmlClosest, objectHasKey, sluggify } from "@util";
import { damageDiceIcon, looksLikeDamageRoll } from "./damage/helpers.ts";
import { DamageRoll } from "./damage/roll.ts";
import { Statistic } from "./statistic/index.ts";

const superEnrichHTML = TextEditor.enrichHTML;
const superCreateInlineRoll = TextEditor._createInlineRoll;
const superOnClickInlineRoll = TextEditor._onClickInlineRoll;

/** Censor enriched HTML according to metagame knowledge settings */
class TextEditorPF2e extends TextEditor {
    static override enrichHTML(content: string | null, options?: EnrichHTMLOptionsPF2e & { async?: false }): string;
    static override enrichHTML(
        content: string | null,
        options?: EnrichHTMLOptionsPF2e & { async: true }
    ): Promise<string>;
    static override enrichHTML(content: string | null, options?: EnrichHTMLOptionsPF2e): string;
    static override enrichHTML(
        this: typeof TextEditor,
        content: string | null,
        options: EnrichHTMLOptionsPF2e = {}
    ): string | Promise<string> {
        if (content?.startsWith("<p>@Localize")) {
            // Remove tags
            content = content.substring(3, content.length - 4);
        }
        const enriched = superEnrichHTML.apply(this, [content, options]);
        if (typeof enriched === "string") {
            return TextEditorPF2e.processUserVisibility(enriched, options);
        }

        return Promise.resolve().then(async () => TextEditorPF2e.processUserVisibility(await enriched, options));
    }

    /** Replace core static method to conditionally handle parsing of inline damage rolls */
    static override async _createInlineRoll(
        match: RegExpMatchArray,
        rollData: Record<string, unknown>,
        options: EvaluateRollParams = {}
    ): Promise<HTMLAnchorElement | null> {
        const anchor = await superCreateInlineRoll.apply(this, [match, rollData, options]);
        const formula = anchor?.dataset.formula;
        if (formula) {
            const roll = ((): DamageRoll | null => {
                try {
                    return new DamageRoll(formula);
                } catch {
                    return null;
                }
            })();
            // Consider any roll formula with d20s or coins to definitely not be a damage roll
            if (!roll || !looksLikeDamageRoll(roll)) {
                return anchor;
            }

            // Replace the die icon with one representing the damage roll's first damage die
            const icon = damageDiceIcon(roll);
            // The fourth match group will be a label
            const label = match[4] && match[4].length > 0 ? match[4] : roll.formula;

            anchor.innerHTML = `${icon.outerHTML}${label}`;
            anchor.dataset.tooltip = roll.formula;
            anchor.dataset.damageRoll = "";

            const isPersistent = roll.instances.length > 0 && roll.instances.every((i) => i.persistent);
            if (isPersistent) {
                anchor.draggable = true;
                anchor.dataset.persistent = "";
            }
        }

        return anchor;
    }

    /** Replace core static method to conditionally handle inline damage roll clicks */
    static override async _onClickInlineRoll(event: MouseEvent): Promise<ChatMessage> {
        const anchor = event.currentTarget ?? null;
        if (!(anchor instanceof HTMLAnchorElement && anchor.dataset.formula && "damageRoll" in anchor.dataset)) {
            return superOnClickInlineRoll.apply(this, [event]);
        }

        // Get the speaker and roll data from the clicked sheet or chat message
        const sheetElem = htmlClosest(anchor, ".sheet");
        const messageElem = htmlClosest(anchor, "li.chat-message");
        const app = ui.windows[Number(sheetElem?.dataset.appid)];
        const message = game.messages.get(messageElem?.dataset.messageId ?? "");
        const [actor, rollData]: [ActorPF2e | null, Record<string, unknown>] =
            app instanceof ActorSheetPF2e
                ? [app.actor, app.actor.getRollData()]
                : app instanceof ItemSheetPF2e
                ? [app.item.actor, app.item.getRollData()]
                : message?.actor
                ? [message.actor, message.getRollData()]
                : [null, {}];
        const options = anchor.dataset.flavor ? { flavor: anchor.dataset.flavor } : {};
        const roll = new DamageRoll(anchor.dataset.formula, rollData, options);

        const speaker = ChatMessagePF2e.getSpeaker({ actor });
        const rollMode = objectHasKey(CONFIG.Dice.rollModes, anchor.dataset.mode) ? anchor.dataset.mode : "roll";

        return roll.toMessage({ speaker, flavor: roll.options.flavor }, { rollMode });
    }

    static processUserVisibility(content: string, options: EnrichHTMLOptionsPF2e): string {
        const $html = $("<div>").html(content);
        const document = options.rollData?.actor ?? null;
        UserVisibilityPF2e.process($html, { document });

        return $html.html();
    }

    static async enrichString(
        data: RegExpMatchArray,
        options: EnrichHTMLOptionsPF2e = {}
    ): Promise<HTMLElement | null> {
        if (data.length < 4) return null;
        const item = options.rollData?.item ?? null;
        const [_match, inlineType, paramString, buttonLabel] = data;

        switch (inlineType) {
            case "Check": {
                const actor = options.rollData?.actor ?? item?.actor ?? null;
                return this.#createCheck({ paramString, inlineLabel: buttonLabel, item, actor });
            }
            case "Localize":
                return this.#localize(paramString, options);
            case "Template":
                return this.#createTemplate(paramString, buttonLabel, item?.system);
            default:
                return null;
        }
    }

    /**
     * Convert an XML node into an HTML span element with data-visibility, data-whose, and class attributes
     * @param html    The HTML element containing the XML node: mutated by this method as part of node replacement
     * @param name    The name of the node to convert
     * @param options attributes to add to the generated span element
     * @returns The generated span element, or `null` if no `name` node was found
     */
    static convertXMLNode(
        html: HTMLElement,
        name: string,
        { visible = undefined, visibility = null, whose = "self", classes = [] }: ConvertXMLNodeOptions
    ): HTMLElement | null {
        const node = html.querySelector(name);
        if (!node) return null;

        const span = document.createElement("span");
        const { dataset, classList } = span;

        if (visible !== undefined) visibility = visible ? "all" : "gm";
        if (visibility) dataset.visibility = visibility;
        if (whose) dataset.whose = whose;
        for (const cssClass of classes) {
            classList.add(cssClass);
        }

        span.append(...Array.from(node.childNodes));
        node.replaceWith(span);

        return span;
    }

    static async #localize(paramString: string, options: EnrichHTMLOptionsPF2e = {}): Promise<HTMLElement | null> {
        const content = game.i18n.localize(paramString);
        if (content === paramString) {
            ui.notifications.error(`Failed to localize ${paramString}!`);
            return null;
        }
        const result = document.createElement("span");
        result.innerHTML = await TextEditor.enrichHTML(content, { ...options, async: true });
        return result;
    }

    /** Create inline template button from @template command */
    static #createTemplate(paramString: string, label?: string, itemData?: ItemSystemData): HTMLSpanElement | null {
        // Get parameters from data
        const params = this.#parseInlineParams(paramString, { first: "type" });
        if (!params) return null;

        // Check for correct param notation
        if (!params.type) {
            ui.notifications.error(game.i18n.localize("PF2E.InlineTemplateErrors.TypeMissing"));
        } else if (!params.distance) {
            ui.notifications.error(game.i18n.localize("PF2E.InlineTemplateErrors.DistanceMissing"));
            return null;
        } else if (!objectHasKey(CONFIG.PF2E.areaTypes, params.type)) {
            ui.notifications.error(
                game.i18n.format("PF2E.InlineTemplateErrors.TypeUnsupported", { type: params.type })
            );
            return null;
        } else if (isNaN(+params.distance)) {
            ui.notifications.error(
                game.i18n.format("PF2E.InlineTemplateErrors.DistanceNoNumber", { distance: params.distance })
            );
            return null;
        } else if (params.width && isNaN(+params.width)) {
            ui.notifications.error(
                game.i18n.format("PF2E.InlineTemplateErrors.WidthNoNumber", { width: params.width })
            );
            return null;
        } else {
            // If no traits are entered manually use the traits from rollOptions if available
            params.traits ||= itemData?.traits?.value?.join(",") ?? "";

            // If no button label is entered directly create default label
            if (!label) {
                label = game.i18n.format("PF2E.TemplateLabel", {
                    size: params.distance,
                    unit: game.i18n.localize("PF2E.Foot"),
                    shape: game.i18n.localize(CONFIG.PF2E.areaTypes[params.type]),
                });
            }

            // Add the html elements used for the inline buttons
            const html = document.createElement("span");
            html.innerHTML = label;
            html.setAttribute("data-pf2-effect-area", params.type);
            html.setAttribute("data-pf2-distance", params.distance);
            if (params.traits !== "") html.setAttribute("data-pf2-traits", params.traits);
            if (params.type === "line") html.setAttribute("data-pf2-width", params.width ?? "5");
            return html;
        }
        return null;
    }

    static #parseInlineParams(
        paramString: string,
        options: { first?: string } = {}
    ): Record<string, string | undefined> | null {
        const parts = paramString.split("|");
        const result = parts.reduce((result, part, idx) => {
            if (idx === 0 && options.first && !part.includes(":")) {
                result[options.first] = part.trim();
                return result;
            }

            const colonIdx = part.indexOf(":");
            const portions = colonIdx >= 0 ? [part.slice(0, colonIdx), part.slice(colonIdx + 1)] : [part, ""];
            result[portions[0]] = portions[1];

            return result;
        }, {} as Record<string, string | undefined>);

        return result;
    }

    static #createCheck({
        paramString,
        inlineLabel,
        item = null,
        actor = item?.actor ?? null,
    }: {
        paramString: string;
        inlineLabel?: string;
        item?: ItemPF2e | null;
        actor?: ActorPF2e | null;
    }): HTMLElement | null {
        // Parse the parameter string
        const rawParams = this.#parseInlineParams(paramString, { first: "type" });
        if (!rawParams) return null;

        if (!rawParams.type) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.TypeMissing"));
            return null;
        }

        const params: CheckParams = {
            ...rawParams,
            type: rawParams.type,
            dc: rawParams.dc ?? "",
            basic: rawParams.basic !== undefined && ["true", ""].includes(rawParams.basic),
            showDC: rawParams.showDC === "" ? "all" : rawParams.showDC,
            traits: (() => {
                const traits: string[] = [];
                // Set item traits
                const itemTraits = item?.system.traits?.value ?? [];
                if (rawParams.overrideTraits !== "true") {
                    traits.push(...itemTraits);
                }

                // Set action slug as a roll option
                if (item?.slug) {
                    const actionName = "action:" + item?.slug;
                    traits.push(actionName);
                }

                // Set origin actor traits.
                const actorTraits = actor?.getSelfRollOptions("origin");
                if (actorTraits && rawParams.overrideTraits !== "true") {
                    traits.push(...actorTraits);
                }

                // Add traits for basic checks
                if (rawParams.basic === "true") traits.push("damaging-effect");

                // Add param traits
                if (rawParams.traits) traits.push(...rawParams.traits.split(",").map((trait) => trait.trim()));

                // Deduplicate traits
                return Array.from(new Set(traits));
            })(),
        };

        const types = params.type.split(",");
        let adjustments = params.adjustment?.split(",") ?? ["0"];

        if (types.length !== adjustments.length && adjustments.length > 1) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.AdjustmentLengthMismatch"));
            return null;
        } else if (types.length > adjustments.length) {
            adjustments = new Array(types.length).fill(adjustments[0]);
        }

        if (adjustments.some((adj) => adj !== "" && isNaN(parseInt(adj)))) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.NonIntegerAdjustment"));
            return null;
        }

        const buttons = types.map((type, i) =>
            this.#createSingleCheck({
                actor,
                item,
                inlineLabel,
                params: { ...params, ...{ type, adjustment: adjustments[i] || "0" } },
            })
        );
        if (buttons.length === 1) {
            return buttons[0];
        } else {
            const checkGroup = document.createElement("div");
            checkGroup.setAttribute("data-pf2-checkgroup", "");
            for (const button of buttons) {
                if (button === null) {
                    // Warning should have been displayed already by #createSingleCheck
                    return null;
                }
                if (checkGroup.hasChildNodes()) {
                    checkGroup.appendChild(document.createElement("br"));
                }
                checkGroup.appendChild(button);
            }
            return checkGroup;
        }
    }

    static #createSingleCheck({
        params,
        item,
        actor,
        inlineLabel,
    }: {
        params: CheckParams;
        item?: ItemPF2e | null;
        actor?: ActorPF2e | null;
        inlineLabel?: string;
    }): HTMLSpanElement | null {
        // Build the inline link
        const html = document.createElement("span");
        html.setAttribute("data-pf2-traits", `${params.traits}`);
        const name = params.name ?? item?.name ?? params.type;
        html.setAttribute("data-pf2-label", game.i18n.format("PF2E.InlineCheck.DCWithName", { name }));
        html.setAttribute("data-pf2-repost-flavor", name);
        const role = params.showDC ?? "owner";
        html.setAttribute("data-pf2-show-dc", params.showDC ?? role);
        html.setAttribute("data-pf2-adjustment", params.adjustment ?? "");
        if (params.roller) {
            html.setAttribute("data-pf2-roller", params.roller);
        }

        switch (params.type) {
            case "flat":
                html.innerHTML = inlineLabel ?? game.i18n.localize("PF2E.FlatCheck");
                html.setAttribute("data-pf2-check", "flat");
                break;
            case "perception":
                html.innerHTML = inlineLabel ?? game.i18n.localize("PF2E.PerceptionLabel");
                html.setAttribute("data-pf2-check", "perception");
                break;
            case "fortitude":
            case "reflex":
            case "will": {
                const saveName = game.i18n.localize(CONFIG.PF2E.saves[params.type]);
                const saveLabel = params.basic
                    ? game.i18n.format("PF2E.InlineCheck.BasicWithSave", { save: saveName })
                    : saveName;
                html.innerHTML = inlineLabel ?? saveLabel;
                html.setAttribute("data-pf2-check", params.type);
                break;
            }
            default: {
                // Skill or Lore
                const shortForm = (() => {
                    if (objectHasKey(SKILL_EXPANDED, params.type)) {
                        return SKILL_EXPANDED[params.type].shortForm;
                    } else if (objectHasKey(SKILL_DICTIONARY, params.type)) {
                        return params.type;
                    }
                    return;
                })();
                const skillLabel = shortForm
                    ? game.i18n.localize(CONFIG.PF2E.skills[shortForm])
                    : params.type
                          .split("-")
                          .map((word) => {
                              return word.slice(0, 1).toUpperCase() + word.slice(1);
                          })
                          .join(" ");
                html.innerHTML = inlineLabel ?? skillLabel;
                html.dataset.pf2Check = sluggify(params.type);
            }
        }

        if (params.type && params.dc) {
            // Let the inline roll function handle level base DCs
            const checkDC = params.dc === "@self.level" ? params.dc : getCheckDC({ name, params, item, actor });
            html.setAttribute("data-pf2-dc", checkDC);

            // When using fixed DCs/adjustments, parse and add them to render the real DC
            const dc = params.dc === "" ? NaN : Number(params.dc);
            const displayedDC = !isNaN(dc) ? `${dc + Number(params.adjustment)}` : checkDC;
            const text = html.innerHTML;
            if (checkDC !== "@self.level") {
                html.innerHTML = game.i18n.format("PF2E.DCWithValueAndVisibility", { role, dc: displayedDC, text });
            }
        }

        // If the roller is self, don't create an inline roll if the user has no control over it
        if (params.roller === "self" && actor && !actor.canUserModify(game.user, "update")) {
            return createHTMLElement("span", { children: [html.innerText] });
        }

        return html;
    }
}

function getCheckDC({
    name,
    params,
    item = null,
    actor = item?.actor ?? null,
}: {
    name: string;
    params: CheckParams;
    item?: ItemPF2e | null;
    actor?: ActorPF2e | null;
}): string {
    const { type } = params;
    const dc = params.dc;
    const base = (() => {
        if (dc.startsWith("resolve") && actor) {
            params.immutable ||= "true";
            const resolve = dc.match(/resolve\((.+?)\)$/);
            const value = resolve && resolve?.length > 0 ? resolve[1] : "";
            const saferEval = (resolveString: string): number => {
                try {
                    const rollData = item?.getRollData() ?? actor?.getRollData();
                    return Roll.safeEval(Roll.replaceFormulaData(resolveString, rollData));
                } catch {
                    return 0;
                }
            };
            return Number(saferEval(value));
        }
        return Number(dc) || undefined;
    })();

    if (base) {
        const getStatisticValue = (selectors: string[]): string => {
            if (item?.actor && params.immutable !== "true") {
                const { actor } = item;
                const { synthetics } = actor;
                const modifier = new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.ModifierTitle",
                    modifier: base - 10,
                    adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, selectors, "base"),
                });
                const stat = new Statistic(actor, {
                    slug: type,
                    label: name,
                    domains: selectors,
                    modifiers: [modifier],
                });

                return String(stat.dc.value);
            }
            return base.toString();
        };

        const slugName = sluggify(name);
        if (type === "flat") {
            return params.immutable === "false"
                ? getStatisticValue(["inline-dc", `${slugName}-inline-dc`])
                : base.toString();
        } else {
            const selectors = ["all", "inline-dc", `${slugName}-inline-dc`];
            return getStatisticValue(selectors);
        }
    }
    return "0";
}

interface EnrichHTMLOptionsPF2e extends EnrichHTMLOptions {
    rollData?: {
        actor?: ActorPF2e | null;
        item?: ItemPF2e | null;
        mod?: number;
        [key: string]: unknown;
    };
}

interface ConvertXMLNodeOptions {
    /** The value of the data-visibility attribute to add to the span element */
    visibility?: UserVisibility | null;

    /** Whether or not it should be visible or not, which maps to visibility (for this release) */
    visible?: boolean;
    /**
     * Whether this piece of data belongs to the "self" actor or the target: used by UserVisibilityPF2e to
     * determine which actor's ownership to check
     */
    whose?: "self" | "target" | null;
    /** Any additional classes to add to the span element */
    classes?: string[];
}

interface CheckParams {
    type: string;
    dc: string;
    basic: boolean;
    adjustment?: string;
    traits: string[];
    name?: string;
    showDC?: string;
    immutable?: string;
    roller?: string;
}

export { EnrichHTMLOptionsPF2e, TextEditorPF2e };
