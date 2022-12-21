import { ActorPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers";
import { ActorSheetPF2e } from "@actor/sheet/base";
import { SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/values";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import { ItemSystemData } from "@item/data/base";
import { ChatMessagePF2e } from "@module/chat-message";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/util";
import { UserVisibility, UserVisibilityPF2e } from "@scripts/ui/user-visibility";
import { fontAwesomeIcon, htmlClosest, objectHasKey, sluggify } from "@util";
import { looksLikeDamageFormula } from "./damage";
import { DamageRoll } from "./damage/roll";
import { Statistic } from "./statistic";

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
        if (formula && looksLikeDamageFormula(formula)) {
            const roll = ((): DamageRoll | null => {
                try {
                    return new DamageRoll(formula);
                } catch {
                    return null;
                }
            })();

            // Replace the die icon with one representing the damage roll's first damage die
            const firstDice = roll?.dice.at(0);
            // The fourth match group will be a label
            const label = match[4] && match[4].length > 0 ? match[4] : roll!.formula;
            const icon = ((): HTMLElement => {
                if (firstDice instanceof Die && [4, 8, 6, 10, 12].includes(firstDice.faces)) {
                    return fontAwesomeIcon(`dice-d${firstDice.faces}`);
                }
                return fontAwesomeIcon(firstDice ? "dice-d20" : "calculator");
            })();

            anchor.innerHTML = `${icon.outerHTML}${label}`;
            anchor.dataset.tooltip = roll!.formula;
            anchor.dataset.damageRoll = "";
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
        const rollMode = objectHasKey(CONFIG.Dice.rollModes, anchor.dataset.mode) ? anchor.dataset.mode : "publicroll";

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
        const rawParams = ((): Map<string, string> | string => {
            const error = "Wrong notation for params - use [type1:value1|type2:value2|...]";
            const parameters = new Map();

            const paramStrings = paramString.trim().split("|");
            if (!Array.isArray(paramStrings)) return error;

            for (const param of paramStrings) {
                const paramComponents = param.trim().split(":");
                if (paramComponents.length !== 2) return error;

                parameters.set(paramComponents[0].trim(), paramComponents[1].trim());
            }

            return parameters;
        })();

        // Check for correct syntax
        if (typeof rawParams === "string") {
            ui.notifications.error(rawParams);
            return null;
        }

        const params = Object.fromEntries(rawParams);

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
            if (!params.traits) {
                params.traits = "";

                if (itemData?.traits) {
                    let traits = itemData.traits.value.join(",");
                    if (!(itemData.traits.custom === "")) {
                        traits = traits.concat(`, ${itemData.traits.custom}`);
                    }
                    params.traits = traits;
                }
            }

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
    }): HTMLSpanElement | null {
        // Parse the parameter string
        const parts = paramString.split("|");
        const params: { type: string; dc: string } & Record<string, string> = { type: "", dc: "" };
        for (const paramPart of parts) {
            const param = paramPart.trim();
            if (param.startsWith("traits:")) {
                // Special case for "traits" that may be roll options
                params.traits = param.substring(7);
            } else if (param === "showDC") {
                params.showDC = "all";
            } else {
                const paramParts = param.split(":");
                if (paramParts.length !== 2) {
                    ui.notifications.warn(`Error. Expected "parameter:value" but got: ${param}`);
                    return null;
                }
                params[paramParts[0].trim()] = paramParts[1].trim();
            }
        }
        if (!params.type) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.TypeMissing"));
            return null;
        }

        const traits: string[] = [];

        // Set item traits
        const itemTraits = item?.system.traits;
        if (itemTraits && params.overrideTraits !== "true") {
            traits.push(...itemTraits.value);
            if (itemTraits.custom) {
                traits.push(...itemTraits.custom.split(",").map((trait) => trait.trim()));
            }
        }

        // Set action slug as a roll option
        if (item?.slug) {
            const actionName = "action:" + item?.slug;
            traits.push(actionName);
        }

        // Set origin actor traits.
        const actorTraits = actor?.getSelfRollOptions("origin");
        if (actorTraits && params.overrideTraits !== "true") {
            traits.push(...actorTraits);
        }

        // Add traits for basic checks
        if (params.basic === "true") traits.push("damaging-effect");

        // Add param traits
        if (params.traits) traits.push(...params.traits.split(",").map((trait) => trait.trim()));

        // Deduplicate traits
        const allTraits = Array.from(new Set(traits));

        // Build the inline link
        const html = document.createElement("span");
        html.setAttribute("data-pf2-traits", `${allTraits}`);
        const name = params.name ?? item?.name ?? params.type;
        html.setAttribute("data-pf2-label", game.i18n.format("PF2E.InlineCheck.DCWithName", { name }));
        html.setAttribute("data-pf2-repost-flavor", name);
        const role = params.showDC ?? "owner";
        html.setAttribute("data-pf2-show-dc", params.showDC ?? role);
        html.setAttribute("data-pf2-adjustment", params.adjustment ?? "");

        switch (params.type) {
            case "flat":
                html.innerHTML = inlineLabel ?? game.i18n.localize("PF2E.FlatCheck");
                html.setAttribute("data-pf2-check", "flat");
                break;
            case "perception":
                html.innerHTML = inlineLabel ?? game.i18n.localize("PF2E.PerceptionCheck");
                html.setAttribute("data-pf2-check", "perception");
                break;
            case "fortitude":
            case "reflex":
            case "will": {
                const saveName = game.i18n.localize(CONFIG.PF2E.saves[params.type]);
                const saveLabel =
                    params.basic === "true"
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
                        return SKILL_EXPANDED[params.type].shortform;
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
                html.setAttribute("data-pf2-check", params.type);
            }
        }

        if (params.type && params.dc) {
            // Let the inline roll function handle level base DCs
            const checkDC = params.dc === "@self.level" ? params.dc : getCheckDC({ name, params, item, actor });
            html.setAttribute("data-pf2-dc", checkDC);
            const text = html.innerHTML;
            if (checkDC !== "@self.level") {
                html.innerHTML = game.i18n.format("PF2E.DCWithValueAndVisibility", { role, dc: checkDC, text });
            }
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
    params: { type: string; dc: string } & Record<string, string | undefined>;
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
                    return Roll.safeEval(Roll.replaceFormulaData(resolveString, { actor, item: item ?? {} }));
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
                    modifiers: [modifier, ...extractModifiers(synthetics, selectors)],
                });

                return String(stat.dc.value);
            }
            return base.toString();
        };

        const slugName = sluggify(name);

        switch (type) {
            case "flat":
                return params.immutable === "false"
                    ? getStatisticValue(["inline-dc", `${slugName}-inline-dc`])
                    : base.toString();
            case "perception":
                return getStatisticValue(["all", "inline-dc", `${slugName}-inline-dc`]);
            case "fortitude":
            case "reflex":
            case "will": {
                const selectors = ["all", "inline-dc", `${slugName}-inline-dc`];
                return getStatisticValue(selectors);
            }
            default: {
                // Skill or Lore
                const selectors = ["all", "inline-dc", `${slugName}-inline-dc`];
                return getStatisticValue(selectors);
            }
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
    whose?: "self" | "target";
    /** Any additional classes to add to the span element */
    classes?: string[];
}

export { TextEditorPF2e, EnrichHTMLOptionsPF2e };
