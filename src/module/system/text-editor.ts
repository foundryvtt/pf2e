import type { ActorPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import type { EnrichmentOptions } from "@client/applications/ux/text-editor.d.mts";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import { AbilityTrait } from "@item/ability/types.ts";
import { EFFECT_AREA_SHAPES } from "@item/spell/values.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import {
    extractDamageDice,
    extractModifierAdjustments,
    extractModifiers,
    processDamageCategoryStacking,
} from "@module/rules/helpers.ts";
import { eventToRollParams } from "@module/sheet/helpers.ts";
import { USER_VISIBILITIES, UserVisibility, UserVisibilityPF2e } from "@scripts/ui/user-visibility.ts";
import {
    createHTMLElement,
    fontAwesomeIcon,
    getActionGlyph,
    htmlClosest,
    localizer,
    objectHasKey,
    setHasElement,
    sluggify,
    splitListString,
    tupleHasValue,
} from "@util";
import * as R from "remeda";
import { ActionMacroHelpers } from "./action-macros/helpers.ts";
import { DamagePF2e } from "./damage/damage.ts";
import { DamageModifierDialog } from "./damage/dialog.ts";
import { createDamageFormula } from "./damage/formula.ts";
import {
    applyBaseDamageAlterations,
    damageDiceIcon,
    extractBaseDamage,
    looksLikeDamageRoll,
} from "./damage/helpers.ts";
import { DamageRoll } from "./damage/roll.ts";
import { DamageDamageContext, DamageFormulaData, SimpleDamageTemplate } from "./damage/types.ts";
import { Statistic } from "./statistic/index.ts";

/** Censor enriched HTML according to metagame knowledge settings */
class TextEditorPF2e extends foundry.applications.ux.TextEditor {
    static override async enrichHTML(content: string | null, options: EnrichmentOptionsPF2e = {}): Promise<string> {
        options.secrets ??= game.user.isGM;

        // Remove tags from @Localize only enriches.
        // Those often include HTML, including <p>, and <p> tags cannot be nested.
        content = content?.replace(/^\s*<p>@Localize\[([\w.]+)\]<\/p>\s*$/, "@Localize[$1]") ?? null;

        const enriched = await super.enrichHTML(content, options);
        if (typeof enriched === "string" && (options.processVisibility ?? true)) {
            return TextEditorPF2e.processUserVisibility(enriched, options);
        }

        return TextEditorPF2e.processUserVisibility(enriched, options);
    }

    /** Replace core static method to conditionally handle parsing of inline damage rolls */
    static override async _createInlineRoll(
        match: RegExpMatchArray,
        rollData: Record<string, unknown>,
        options: EnrichmentOptionsPF2e = {},
    ): Promise<HTMLAnchorElement | null> {
        const anchor = await super._createInlineRoll(match, rollData, options);
        const formula = anchor?.dataset.formula;
        const rollModes = ["roll", ...Object.values(CONST.DICE_ROLL_MODES)];
        if (!formula || !rollModes.includes(anchor.dataset.mode ?? "")) {
            return anchor;
        }

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

        return anchor;
    }

    /** Replace core static method to conditionally handle inline damage roll clicks */
    static override async _onClickInlineRoll(event: PointerEvent): Promise<ChatMessage | undefined> {
        const anchor = htmlClosest(event.target, "a");
        if (!anchor?.dataset.formula || !("damageRoll" in anchor.dataset)) {
            return super._onClickInlineRoll(event);
        }

        // Get the speaker and roll data from the clicked sheet or chat message
        const sheetElem = htmlClosest(anchor, ".sheet");
        const messageElem = htmlClosest(anchor, "li.chat-message");
        const app = ui.windows[Number(sheetElem?.dataset.appid)];
        const message = game.messages.get(messageElem?.dataset.messageId ?? "");

        const [actor, rollData] = ((): [ActorPF2e | null, Record<string, unknown>] => {
            if (message?.speakerActor) {
                return [message.speakerActor, message.getRollData()];
            }
            if (app instanceof ActorSheetPF2e) {
                const itemId = anchor.dataset.itemId;
                return [app.actor, app.actor.items.get(itemId)?.getRollData() ?? app.actor.getRollData()];
            }
            if (app instanceof ItemSheetPF2e) {
                return [app.actor, app.item.getRollData()];
            }

            // Retrieve item/actor from anywhere via UUID
            const itemUuid = htmlClosest(anchor, "[data-item-uuid]")?.dataset.itemUuid;
            const itemByUUID = itemUuid && !itemUuid.startsWith("Compendium.") ? fromUuidSync(itemUuid) : null;
            if (itemByUUID instanceof ItemPF2e) {
                return [itemByUUID.actor, itemByUUID.getRollData()];
            }

            return [null, {}];
        })();

        const options = anchor.dataset.flavor ? { flavor: anchor.dataset.flavor } : {};

        const speaker = ChatMessagePF2e.getSpeaker({ actor });
        const rollMode = objectHasKey(CONFIG.Dice.rollModes, anchor.dataset.mode) ? anchor.dataset.mode : "roll";

        const baseFormula = anchor.dataset.baseFormula;
        if (baseFormula) {
            const item = rollData.item instanceof ItemPF2e ? rollData.item : null;
            const traits = splitListString(anchor.dataset.traits ?? "");
            const overrideTraits = "overrideTraits" in anchor.dataset;
            const immutable = "immutable" in anchor.dataset;
            const rollOptions = splitListString(anchor.dataset.rollOptions ?? "");
            const domains = splitListString(anchor.dataset.domains ?? "");
            const extraRollOptions = R.unique([...traits, ...rollOptions]).filter(R.isTruthy);

            const args = await augmentInlineDamageRoll(baseFormula, {
                ...eventToRollParams(event, { type: "damage" }),
                actor,
                item,
                domains,
                traits,
                overrideTraits,
                name: anchor.dataset.name,
                immutable,
                extraRollOptions,
            });
            if (args) {
                const subtitle = ((): string | null => {
                    if (anchor.dataset.name || overrideTraits) return null;
                    const damageKinds = args.template.damage.roll.kinds;
                    const locKey =
                        damageKinds.has("damage") && !damageKinds.has("healing")
                            ? "Damage"
                            : damageKinds.has("healing") && !damageKinds.has("damage")
                              ? "Healing"
                              : "Both";
                    return game.i18n.localize(`PF2E.Damage.Kind.${locKey}.Roll.Noun`);
                })();
                const name =
                    subtitle && item?.isOfType("action", "feat") && item.actionCost
                        ? await fa.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
                              glyph: getActionGlyph(item.actionCost),
                              subtitle,
                              title: item.name,
                          })
                        : (anchor.dataset.name ?? item?.name ?? "");
                args.template.name = game.i18n.localize(name);

                await DamagePF2e.roll(args.template, args.context);
            }

            return;
        }

        const roll = new DamageRoll(anchor.dataset.formula, rollData, options);
        const flavor = roll.options.flavor ? roll.options.flavor : undefined;
        return roll.toMessage({ speaker, flavor }, { rollMode });
    }

    static processUserVisibility(content: string, options: EnrichmentOptionsPF2e): string {
        const html = createHTMLElement("div", { innerHTML: content });
        const rollData = resolveRollData(options.rollData);
        const document = rollData.actor ?? options.relativeTo;
        UserVisibilityPF2e.process(html, { document });

        return html.innerHTML;
    }

    static async enrichString(
        data: RegExpMatchArray,
        options: EnrichmentOptionsPF2e = {},
    ): Promise<HTMLElement | null> {
        if (data.length < 4) return null;
        const rollData = resolveRollData(options.rollData);
        const item = rollData.item ?? null;
        const [_match, inlineType, paramString, inlineLabel] = data;

        switch (inlineType) {
            case "act":
                return this.#createAction(data.groups?.slug ?? "", data.groups?.options ?? "", data.groups?.label);
            case "Check": {
                const actor = rollData.actor ?? item?.actor ?? null;
                return this.#createCheck({ paramString, inlineLabel, item, actor });
            }
            case "Damage":
                return this.#createDamageRoll({ paramString, rollData, inlineLabel });
            case "Localize":
                return this.#localize(paramString, options);
            case "Template":
                return this.#createTemplate(paramString, inlineLabel, item);
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
        { visible, visibility, whose, tooltip, classes }: ConvertXMLNodeOptions,
    ): HTMLElement | null {
        const node = html.querySelector(name);
        if (!node) return null;

        const span = document.createElement("span");
        const { dataset, classList } = span;

        if (typeof visible === "boolean") visibility = visible ? "all" : "gm";
        if (visibility && visibility !== "all") dataset.visibility = visibility;
        if (whose) dataset.whose = whose;
        if (tooltip) dataset.tooltip = tooltip.trim();
        if (classes) {
            for (const cssClass of classes) {
                classList.add(cssClass);
            }
        }

        span.append(...Array.from(node.childNodes));
        node.replaceWith(span);

        return span;
    }

    static async #localize(paramString: string, options: EnrichmentOptionsPF2e): Promise<HTMLElement | null> {
        const content = game.i18n.localize(paramString);
        if (content === paramString) {
            ui.notifications.error(`Failed to localize ${paramString}!`);
            return null;
        }
        const result = document.createElement("span");
        result.innerHTML = await TextEditorPF2e.enrichHTML(content, options);
        return result;
    }

    /** Create inline template button from @template command */
    static #createTemplate(paramString: string, label?: string, item?: ItemPF2e | null): HTMLSpanElement | null {
        // Get parameters from data
        const params = this.#parseInlineParams(paramString, { first: "type" });
        if (!params) return null;

        // Check for correct param notation
        if (!params.type) {
            ui.notifications.error(game.i18n.localize("PF2E.InlineTemplateErrors.TypeMissing"));
        } else if (!params.distance) {
            ui.notifications.error(game.i18n.localize("PF2E.InlineTemplateErrors.DistanceMissing"));
            return null;
        } else if (!tupleHasValue(EFFECT_AREA_SHAPES, params.type)) {
            ui.notifications.error(
                game.i18n.format("PF2E.InlineTemplateErrors.TypeUnsupported", { type: params.type }),
            );
            return null;
        } else if (isNaN(+params.distance)) {
            ui.notifications.error(
                game.i18n.format("PF2E.InlineTemplateErrors.DistanceNoNumber", { distance: params.distance }),
            );
            return null;
        } else if (params.width && isNaN(+params.width)) {
            ui.notifications.error(
                game.i18n.format("PF2E.InlineTemplateErrors.WidthNoNumber", { width: params.width }),
            );
            return null;
        } else {
            // If no traits are entered manually use the traits from rollOptions if available
            params.traits ||= item?.system.traits.value?.toString() ?? "";
            params.itemUuid ||= item?.uuid ?? "";

            // If no button label is entered directly create default label
            if (!label) {
                label = game.i18n.format("PF2E.TemplateLabel", {
                    size: params.distance,
                    unit: game.i18n.localize("PF2E.Foot.Label"),
                    shape: game.i18n.localize(`PF2E.Area.Shape.${params.type}`),
                });
            }

            // Add the html elements used for the inline buttons
            const html = document.createElement("span");
            html.innerHTML = label;
            html.setAttribute("data-pf2-effect-area", params.type);
            html.setAttribute("data-pf2-distance", params.distance);
            if (params.traits !== "") html.setAttribute("data-pf2-traits", params.traits);
            if (params.type === "line") html.setAttribute("data-pf2-width", params.width ?? "5");
            if (["cone", "line"].includes(params.type)) {
                html.setAttribute("data-tooltip", "PF2E.Item.Spell.MeasuredTemplate.PlacementTooltip");
                html.setAttribute("data-tooltip-class", "pf2e");
            }
            if (params.itemUuid !== "") html.setAttribute("data-item-uuid", params.itemUuid);
            return html;
        }
        return null;
    }

    static #parseInlineParams(
        paramString: string,
        options: { first?: string } = {},
    ): Record<string, string | undefined> | null {
        const parts = splitListString(paramString, { delimiter: "|" });
        const result = parts.reduce(
            (result, part, idx) => {
                if (idx === 0 && options.first && !part.includes(":")) {
                    result[options.first] = part.trim();
                    return result;
                }

                const colonIdx = part.indexOf(":");
                const portions = colonIdx >= 0 ? [part.slice(0, colonIdx), part.slice(colonIdx + 1)] : [part, ""];
                result[portions[0]] = portions[1];

                return result;
            },
            {} as Record<string, string | undefined>,
        );

        return result;
    }

    static #invalidInlineAction(classes: string[], icons: string | string[], reason: string): HTMLElement {
        const element = document.createElement("a");
        element.classList.add("content-link", "broken", ...classes);
        if (Array.isArray(icons)) {
            const stack = Object.assign(document.createElement("span"), { className: "fa-stack" });
            for (const icon of icons) {
                stack.appendChild(Object.assign(document.createElement("i"), { className: `${icon} fa-stack-1x` }));
            }
            element.appendChild(stack);
        } else {
            element.appendChild(Object.assign(document.createElement("i"), { className: `${icons}` }));
        }
        element.appendChild(document.createTextNode(reason));
        return element;
    }

    static #createAction(slug: string, options: string, label?: string): HTMLElement | null {
        const action = game.pf2e.actions.get(slug);
        if (!action) {
            console.warn("Unable to resolve action", slug);
            return this.#invalidInlineAction(
                ["unresolvable-action"],
                "fa-solid fa-link-slash",
                game.i18n.format("PF2E.InlineAction.Warning.UnresolvableAction", { slug }),
            );
        }

        // params
        const params = splitListString(options, { delimiter: /\s+/ }).reduce(
            (result, option) => {
                const [key, value] = option.split("=").map((s) => s.trim());
                result[key] = value;
                return result;
            },
            {} as Record<string, string>,
        );

        // validate difficulty class format
        const dc = params["difficulty-class"] || params["dc"];
        if (dc && Number.isNumeric(dc) && !Number.isInteger(Number(dc))) {
            console.warn("Numeric DC", dc, "is not an integer for action", slug);
            return this.#invalidInlineAction(
                [],
                ["fa-solid fa-slash", "fa-solid fa-person-running"],
                game.i18n.format("PF2E.InlineAction.Warning.InvalidAction", { slug }),
            );
        }

        const element = document.createElement("span");

        // action attribute
        element.dataset["pf2Action"] = slug;

        // glyph attribute
        const glyph = getActionGlyph(action.cost ?? null);
        if (glyph) {
            element.dataset["pf2Glyph"] = glyph;
        }

        // attributes
        const aliases: Record<string, string> = {
            ["difficulty-class"]: "dc",
            ["roll-options"]: "options",
            stat: "skill",
            statistic: "skill",
        };
        for (const [alias, value] of Object.entries(params)) {
            const key = aliases[alias] ?? alias;
            const attribute = sluggify(`pf2-${key}`, { camel: "dromedary" });
            element.dataset[attribute] = value;
        }

        // variant
        const variant = action.variants.get(params.variant?.trim() ?? "");

        const text = document.createElement("span");
        const trimmedLabel = label?.trim();
        text.innerText = trimmedLabel
            ? trimmedLabel
            : variant?.name
              ? `${game.i18n.localize(action.name)} - ${game.i18n.localize(variant.name)}`
              : game.i18n.localize(action.name);
        element.appendChild(text);

        // difficulty class
        const visibility = (params["show-dc"] || (game.pf2e.settings.metagame.dcs ? "all" : "gm")).trim().toLowerCase();
        const showDC =
            (visibility === "all" && game.pf2e.settings.metagame.dcs) ||
            (["all", "gm"].includes(visibility) && game.user.isGM);

        // statistic
        const statistic = (params["statistic"] || params["stat"] || params["skill"])?.trim();

        if ((dc && showDC) || statistic) {
            element.appendChild(document.createTextNode(" "));

            const details = document.createElement("span");
            if (dc && showDC) {
                if (!Number.isNumeric(dc)) {
                    // (Statistic vs Defense DC)
                    const defense = game.i18n.localize(`PF2E.Check.DC.Specific.${dc}`);
                    const text = statistic
                        ? game.i18n.format("PF2E.InlineAction.Check.StatisticVsDefense", {
                              defense,
                              statistic: ActionMacroHelpers.getSimpleCheckLabel(statistic) || statistic,
                          })
                        : game.i18n.format("PF2E.InlineAction.Check.VsDefense", { defense });
                    details.innerText = `(${text})`;
                } else if (statistic) {
                    // (<span data-visibility="...">DC #</span> Statistic)
                    const span = createHTMLElement("span", {
                        dataset: { visibility },
                        children: [game.i18n.format("PF2E.InlineAction.Check.DC", { dc })],
                    });
                    const end = statistic ? ` ${ActionMacroHelpers.getSimpleCheckLabel(statistic) || statistic})` : ")";
                    details.append("(", span, end);
                } else {
                    // <span data-visibility="...">(DC #)</span>
                    details.dataset.visibility = visibility;
                    details.innerText = `(${game.i18n.format("PF2E.InlineAction.Check.DC", { dc })})`;
                }
            } else {
                // (Statistic)
                const text = ActionMacroHelpers.getSimpleCheckLabel(statistic) || statistic;
                details.innerText = `(${text})`;
            }
            element.appendChild(details);
        }

        // traits
        const additionalTraits = splitListString(params["traits"] ?? "").filter(
            (t): t is AbilityTrait => t in CONFIG.PF2E.actionTraits,
        );
        const traits = R.unique([variant?.traits ?? action.traits, additionalTraits].flat());

        // traits as tooltip
        element.dataset["tooltip"] = traits
            .map((t) => game.i18n.localize(CONFIG.PF2E.actionTraits[t] || t))
            .sort()
            .join(", ");

        // add an indicator for secret checks
        if (traits.includes("secret")) {
            element.dataset["secret"] = "";
        }

        return element;
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

        const type = rawParams.type?.trim();
        if (!type) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.TypeMissing"));
            return null;
        }

        // Determine DC visibility. Players and Parties show their DCs by default.
        const showDC = setHasElement(USER_VISIBILITIES, rawParams.showDC)
            ? rawParams.showDC
            : actor?.hasPlayerOwner || actor?.isOfType("party") || game.pf2e.settings.metagame.dcs
              ? "all"
              : "gm";

        // Determine traits. If overrideTraits is given and looks like a list of traits, we use that as a trait list
        const basic = "basic" in rawParams;
        const overrideTraits = "overrideTraits" in rawParams;
        const rawTraits = splitListString(rawParams.traits ?? "");
        if (rawParams.overrideTraits && rawParams.overrideTraits?.trim()?.toLowerCase() !== "true") {
            rawTraits.push(...splitListString(rawParams.overrideTraits));
        }
        const traits = R.unique(overrideTraits ? rawTraits : [rawTraits, item?.system.traits.value ?? []].flat());

        const rollerRole = tupleHasValue(["origin", "target"], rawParams.rollerRole)
            ? rawParams.rollerRole
            : tupleHasValue(SAVE_TYPES, type)
              ? "target"
              : "origin";

        const params: CheckLinkParams = {
            ...rawParams,
            type,
            basic,
            dc: rawParams.dc?.trim() || null,
            against: rawParams.against?.trim() || rawParams.defense?.trim() || null,
            rollerRole,
            showDC,
            overrideTraits,
            traits,
            immutable: "immutable" in rawParams,
            // Set action slug, damaging effect for basic saves, and any parameterized options
            extraRollOptions: [...(basic ? ["damaging-effect"] : []), ...splitListString(rawParams.options ?? "")]
                .filter(R.isTruthy)
                .sort(),
            targetOwner: "targetOwner" in rawParams,
        };

        const types = splitListString(params.type, { unique: false });
        const adjustments = splitListString(params.adjustment ?? "0", { unique: false });
        for (let i = 0; i < types.length; i++) {
            adjustments[i] ??= "0";
        }

        if (adjustments.length > types.length) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.AdjustmentLengthMismatch"));
            return null;
        }
        if (adjustments.some((adj) => !Number.isInteger(Math.trunc(Number(adj))))) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.NonIntegerAdjustment"));
            return null;
        }

        const buttons = types.map((type, i) =>
            this.#createSingleCheck({
                actor,
                item,
                inlineLabel,
                params: { ...params, ...{ type, adjustment: adjustments[i] } },
            }),
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

    static #createSingleCheck({ params, item, actor, inlineLabel }: CreateSingleCheckOptions): HTMLSpanElement | null {
        // Get the icon
        const icon = ((): HTMLElement => {
            switch (params.type) {
                case "fortitude":
                    return fontAwesomeIcon("heart-pulse");
                case "reflex":
                    return fontAwesomeIcon("person-running");
                case "will":
                    return fontAwesomeIcon("brain");
                case "perception":
                    return fontAwesomeIcon("eye");
                default:
                    return fontAwesomeIcon("dice-d20");
            }
        })();
        icon.classList.add("icon");

        const name = game.i18n.localize(params.name ?? item?.name ?? params.type);
        const localize = localizer("PF2E.InlineCheck");

        // Get the label
        const label = (() => {
            if (inlineLabel) return game.i18n.localize(inlineLabel);

            if (tupleHasValue(SAVE_TYPES, params.type)) {
                const saveName = game.i18n.localize(CONFIG.PF2E.saves[params.type]);
                return params.basic ? localize("BasicWithSave", { save: saveName }) : saveName;
            }

            return (
                ActionMacroHelpers.getSimpleCheckLabel(params.type) ??
                params.type
                    .split("-")
                    .map((word) => {
                        return word.slice(0, 1).toUpperCase() + word.slice(1);
                    })
                    .join(" ")
            );
        })();

        const createLabel = (content: string): HTMLSpanElement =>
            createHTMLElement("span", { classes: ["label"], innerHTML: content });

        const anchor = createHTMLElement("a", {
            classes: ["inline-check"],
            children: [icon, createLabel(label)],
            dataset: {
                pf2Traits: params.traits.toString() || null,
                pf2RollOptions: params.extraRollOptions.toString() || null,
                pf2RepostFlavor: name,
                pf2ShowDc: params.showDC === "all" ? null : params.showDC,
                pf2Label: localize("DCWithName", { name }),
                pf2Adjustment: Number(params.adjustment) || null,
                pf2Roller: params.roller || null,
                targetOwner: params.targetOwner,
                pf2Check: sluggify(params.type),
                against: params.against,
                rollerRole: params.rollerRole,
            },
        });

        if (params.against && params.dc) {
            anchor.dataset.tooltip = localize("Invalid", { message: localize("Errors.DCAndDefense") });
            anchor.dataset.invalid = "";
        }

        if (item?.uuid) {
            anchor.dataset.itemUuid = item.uuid;
        }

        if ((params.type && params.dc) || (params.rollerRole === "target" && params.against)) {
            // Let the inline roll function handle level base DCs
            // Don't save the result if we are matching a statistic
            const checkDC = params.dc === "@self.level" ? params.dc : getCheckDC({ name, params, item, actor });
            if (!params.against) anchor.dataset.pf2Dc = checkDC;

            // When using fixed DCs/adjustments, parse and add them to render the real DC
            if (checkDC !== "@self.level") {
                const dc = params.dc === "" ? NaN : Number(checkDC);
                const displayedDC = Number.isNaN(dc) ? checkDC : `${dc + Number(params.adjustment)}`;
                const text = anchor.innerText;
                anchor.querySelector("span.label")?.replaceWith(
                    createLabel(
                        game.i18n.format("PF2E.DCWithValueAndVisibility", {
                            role: params.showDC,
                            dc: displayedDC,
                            text,
                        }),
                    ),
                );
            }
        }

        // If the roller is self, don't create an inline roll if the user has no control over it
        if (params.roller === "self" && actor && !actor.canUserModify(game.user, "update")) {
            return createHTMLElement("span", { children: [anchor.innerText] });
        }

        return anchor;
    }

    static async #createDamageRoll(args: {
        paramString: string;
        rollData?: RollDataPF2e;
        inlineLabel?: string;
    }): Promise<HTMLElement | null> {
        const rawParams = this.#parseInlineParams(args.paramString, { first: "formula" });
        if (!rawParams || !rawParams.formula) {
            ui.notifications.warn(game.i18n.localize("PF2E.InlineCheck.Errors.TypeMissing"));
            return null;
        }

        const item = args.rollData?.item ?? null;
        const actor = args.rollData?.actor ?? item?.actor ?? null;
        const domains = splitListString(rawParams.domains ?? "");

        // Verify all custom domains are valid. Don't allow any valid domains, and don't attempt to sanitize
        if (domains.some((d) => !/^[a-z][-a-z0-9]+-damage$/.test(d))) {
            ui.notifications.warn(game.i18n.format("PF2E.InlineCheck.Errors.InvalidDomains", { type: "@Damage" }));
            return null;
        }

        const immutable = "immutable" in rawParams;
        const overrideTraits = "overrideTraits" in rawParams;
        const traits = ((): string[] => {
            const fromParams = splitListString(rawParams.traits ?? "");
            const fromItem = item?.system.traits?.value ?? [];
            return overrideTraits ? fromParams : R.unique([...fromParams, ...fromItem]);
        })();

        const extraRollOptions = splitListString(rawParams.options ?? "");
        const result = await augmentInlineDamageRoll(rawParams.formula, {
            skipDialog: true,
            immutable,
            actor,
            item,
            domains,
            traits,
            overrideTraits,
            name: rawParams.name?.trim(),
            extraRollOptions,
        });

        // Determine base formula (pre-heighten) that we may show on mouse-over
        const baseFormula = (() => {
            if (!actor) return null;

            return new DamageRoll(rawParams.formula, {
                ...(item?.getRollData() ?? {}),
                actor: { level: (item && "level" in item ? item.level : null) ?? 1 },
            }).formula;
        })();

        // Get new damage roll. If the formula fails, replace with with a simple parse instead
        const roll = result?.template.damage.roll ?? new DamageRoll(rawParams.formula, args.rollData);
        const formula = roll.formula;
        const label =
            "shortLabel" in rawParams // A "short label" will omit all damage types and categories
                ? roll.instances.map((i) => i.head.expression).join(" + ")
                : (args.inlineLabel ?? formula);
        const labelEl = createHTMLElement("span", { children: [label] });

        const element = createHTMLElement("a", {
            classes: ["inline-roll", "roll", baseFormula && baseFormula !== formula ? "altered" : null].filter(
                R.isTruthy,
            ),
            children: [damageDiceIcon(roll), labelEl],
            dataset: {
                formula: roll._formula,
                baseFormula: result ? rawParams.formula : null,
                tooltip: args.inlineLabel
                    ? formula
                    : baseFormula && baseFormula !== formula
                      ? game.i18n.format("PF2E.InlineDamage.Base", { formula: baseFormula })
                      : null,
                damageRoll: rawParams.formula,
                name: rawParams.name,
                immutable: immutable ? "" : null,
                overrideTraits: overrideTraits ? "" : null,
                domains: domains?.join(",") || null,
                traits: traits.toString() || null,
                rollOptions: extraRollOptions.toString() || null,
                itemId: item?.id,
            },
        });

        if (roll.instances.length > 0 && roll.instances.every((i) => i.persistent)) {
            element.draggable = true;
            element.dataset.persistent = "";
        }

        return element;
    }

    /** Create roll options with information about the action being used */
    static createActionOptions(item: Maybe<ItemPF2e>, extra: string[] = []): string[] {
        if (!item?.isOfType("action", "feat") || !item.actionCost) return [];

        const slug = item.slug ?? sluggify(item.name);
        const traits = R.unique([item.system.traits.value, extra.filter((t) => t in CONFIG.PF2E.actionTraits)].flat());
        const actionCost = item.actionCost.value;

        return [
            `action:${slug}`,
            `action:cost:${actionCost}`,
            `self:action:slug:${slug}`,
            `self:action:cost:${actionCost}`,
            ...traits.map((t) => `self:action:trait:${t}`),
        ].filter(R.isTruthy);
    }
}

function getCheckDC({
    name,
    params,
    item = null,
    actor = item?.actor ?? null,
}: {
    name: string;
    params: CheckLinkParams;
    item?: ItemPF2e | null;
    actor?: ActorPF2e | null;
}): string {
    // We assume that we can actually display the dc if against is provided.
    // This function shouldn't be called otherwise.
    if (!params.dc && params.against && actor) {
        const rollOptions = item?.isOfType("action", "feat")
            ? [`origin:action:slug:${item.slug}`, ...item.getRollOptions("item")]
            : [];
        const statistic = actor.getStatistic(params.against)?.clone({ rollOptions });
        return String(statistic?.dc.value ?? 0);
    }

    // Retrieve the base value and identify immutability.
    // resolve() is usually a dc that we don't want to re-apply modifiers to.
    const dc = params.dc;
    const resolvable = !!dc && dc.startsWith("resolve") && !!(item || actor);
    const immutable = params.immutable || resolvable;
    const base = (() => {
        if (resolvable) {
            const resolve = dc.match(/resolve\((.+?)\)$/);
            const value = resolve && resolve?.length > 0 ? resolve[1] : "";
            const saferEval = (resolveString: string): number => {
                try {
                    const rollData = item?.getRollData() ?? actor?.getRollData() ?? {};
                    return Roll.safeEval(Roll.replaceFormulaData(resolveString, rollData));
                } catch {
                    return 0;
                }
            };
            return Number(saferEval(value));
        }
        return Number(dc) || null;
    })();

    // Apply modifiers if this item is mutable. The "all" domain catches elite/weak adjustments
    if (base && actor && !immutable) {
        const idDomain = item ? `${item.id}-inline-dc` : null;
        const slugDomain = `${sluggify(name)}-inline-dc`;
        const domains =
            params.type === "flat"
                ? ["inline-flat-check-dc"]
                : ["all", "inline-dc", idDomain, slugDomain].filter(R.isTruthy);
        const modifier = new ModifierPF2e({
            slug: "base",
            label: "PF2E.ModifierTitle",
            modifier: base - 10,
            adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, domains, "base"),
        });
        const stat = new Statistic(
            actor,
            {
                slug: params.type,
                label: name,
                domains,
                modifiers: [modifier],
            },
            { extraRollOptions: [`inline-dc:value:${base}`], item },
        );
        return String(stat.dc.value);
    }

    return base?.toString() ?? "0";
}

/** Given a damage formula, augments it with modifiers and damage dice for inline rolls */
async function augmentInlineDamageRoll(
    baseFormula: string,
    options: AugmentInlineDamageOptions,
): Promise<{ template: SimpleDamageTemplate; context: DamageDamageContext } | null> {
    const { name, actor, item, traits, immutable, extraRollOptions } = options;

    try {
        // Retrieve roll data. If there is no actor, determine a reasonable "min level" for formula display
        const rollData: Record<string, unknown> = item?.getRollData() ?? actor?.getRollData() ?? {};
        rollData.actor ??= { level: (item && "level" in item ? item.level : null) ?? 1 };

        // Extract terms from formula
        const baseDamageRoll = new DamageRoll(baseFormula, rollData);
        const base = extractBaseDamage(baseDamageRoll);
        const kinds = Array.from(baseDamageRoll.kinds);
        const actionOptions = options.overrideTraits ? [] : TextEditorPF2e.createActionOptions(item, traits);

        const domains = immutable
            ? []
            : [
                  kinds,
                  kinds.map((k) => `inline-${k}`),
                  item ? kinds.map((k) => `${item.id}-inline-${k}`) : null,
                  item ? kinds.map((k) => `${sluggify(item.slug ?? item.name)}-inline-${k}`) : null,
                  options.domains,
              ]
                  .flat()
                  .filter(R.isTruthy);

        const rollOptions = new Set([
            ...(actor?.getRollOptions(domains) ?? []),
            ...(item?.getRollOptions("item") ?? []),
            ...traits,
            ...traits.filter((t) => t in CONFIG.PF2E.actionTraits).map((t) => `item:trait:${t}`),
            ...(extraRollOptions ?? []),
            ...actionOptions,
        ]);

        const firstBase = base.at(0);
        if (!firstBase) return null;

        // Increase or decrease the first instance of damage by 2 or 4 if elite or weak
        if (actor?.isOfType("npc") && (actor.isElite || actor.isWeak)) {
            const value = rollOptions.has("item:frequency:limited") ? 4 : 2;
            firstBase.terms?.push({ dice: null, modifier: actor.isElite ? value : -value });
        }
        if (item?.isOfType("physical")) {
            firstBase.materials = R.unique([item.material.effects, firstBase.materials].flat())
                .filter(R.isTruthy)
                .sort();
        }

        const { modifiers, dice } = (() => {
            if (!actor) return { modifiers: [], dice: [] };

            const extractOptions = { selectors: domains, test: rollOptions };
            return processDamageCategoryStacking(base, {
                modifiers: extractModifiers(actor.synthetics, domains, extractOptions),
                dice: extractDamageDice(actor.synthetics.damageDice, extractOptions),
                test: rollOptions,
            });
        })();

        if (actor && item?.actor) {
            applyBaseDamageAlterations({ actor, item: item as ItemPF2e<ActorPF2e>, base, domains, rollOptions });
        }

        const formulaData: DamageFormulaData = {
            base,
            modifiers,
            dice,
            kinds: new Set(kinds),
        };

        const isAttack = !!traits?.includes("attack");
        const context: DamageDamageContext = {
            type: "damage-roll",
            sourceType: isAttack ? "attack" : "save",
            outcome: isAttack ? "success" : null, // we'll need to support other outcomes later
            domains,
            options: rollOptions,
            self: actor
                ? {
                      actor,
                      token: actor.token,
                      item: item ? (item as ItemPF2e<ActorPF2e>) : null,
                      statistic: null,
                      self: true,
                      modifiers,
                  }
                : null,
            traits: traits?.filter((t): t is AbilityTrait => t in CONFIG.PF2E.actionTraits) ?? [],
        };

        if (!options.skipDialog) {
            const rolled = await new DamageModifierDialog({ formulaData, context }).resolve();
            if (!rolled) return null;
        }

        const { formula, breakdown } = createDamageFormula(formulaData);
        if (!formula || formula === "{}") return null;

        const showBreakdown = game.pf2e.settings.metagame.breakdowns || (actor?.hasPlayerOwner ?? true);
        const roll = new DamageRoll(formula, {}, { showBreakdown });

        const template: SimpleDamageTemplate = {
            name: name ?? item?.name ?? actor?.name ?? "",
            damage: { roll, breakdown },
            modifiers: [...modifiers, ...dice],
            materials: item?.isOfType("physical") ? item.system.material.effects : [],
        };

        return { template, context };
    } catch (ex) {
        console.error(`Failed to parse inline @Damage ${baseFormula}:`, ex);
        return null;
    }
}

function resolveRollData(rollData: EnrichmentOptionsPF2e["rollData"] = {}): RollDataPF2e {
    return rollData instanceof Function ? rollData() : rollData;
}

interface EnrichmentOptionsPF2e extends EnrichmentOptions {
    rollData?: RollDataPF2e | (() => RollDataPF2e);
    /** Whether to run the enriched string through `UserVisibility.process` */
    processVisibility?: boolean;
}

interface RollDataPF2e {
    actor?: ActorPF2e | null;
    item?: ItemPF2e | null;
    mod?: number;
    [key: string]: unknown;
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
    whose?: "self" | "opposer" | null;
    /** Any additional classes to add to the span element */
    classes?: string[];
    /** An optional tooltip to apply to the converted node */
    tooltip?: string;
}

interface CheckLinkParams {
    type: string;
    dc?: Maybe<string>;
    against: string | null;
    rollerRole: "origin" | "target";
    basic: boolean;
    adjustment?: string;
    traits: string[];
    /** Refrain from pulling traits from an action/feat item, or characterizing the chat card as an action.  */
    overrideTraits: boolean;
    extraRollOptions: string[];
    name?: string;
    showDC: UserVisibility;
    /** Refrain from adding domains to the check. */
    immutable: boolean;
    roller?: string;
    targetOwner: boolean;
}

interface CreateSingleCheckOptions {
    params: CheckLinkParams;
    item?: ItemPF2e | null;
    actor?: ActorPF2e | null;
    inlineLabel?: string;
}

interface AugmentInlineDamageOptions {
    skipDialog: boolean;
    /** Refrain from adding domains to the damage roll. */
    immutable: boolean;
    name?: string;
    actor?: ActorPF2e | null;
    item?: ItemPF2e | null;
    traits: string[];
    /** Refrain from pulling traits from an action/feat item, or characterizing the chat card as an action.  */
    overrideTraits: boolean;
    domains: string[];
    extraRollOptions: string[];
}

export { TextEditorPF2e };
export type { EnrichmentOptionsPF2e, RollDataPF2e };
