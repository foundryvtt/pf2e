import type { ActorPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ActorSheetPF2e } from "@actor/sheet/base.ts";
import { SAVE_TYPES, SKILL_DICTIONARY, SKILL_EXPANDED } from "@actor/values.ts";
import { ItemPF2e, ItemSheetPF2e } from "@item";
import { ActionTrait } from "@item/ability/types.ts";
import { ItemSystemData } from "@item/base/data/system.ts";
import { EFFECT_AREA_SHAPES } from "@item/spell/values.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import {
    extractDamageDice,
    extractModifierAdjustments,
    extractModifiers,
    processDamageCategoryStacking,
} from "@module/rules/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
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
    tupleHasValue,
} from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
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

const superEnrichHTML = TextEditor.enrichHTML;
const superEnrichContentLinks = TextEditor._enrichContentLinks;
const superCreateInlineRoll = TextEditor._createInlineRoll;
const superOnClickInlineRoll = TextEditor._onClickInlineRoll;

/** Censor enriched HTML according to metagame knowledge settings */
class TextEditorPF2e extends TextEditor {
    static override enrichHTML(
        content: string | null,
        options: EnrichmentOptionsPF2e & { async: true },
    ): Promise<string>;
    static override enrichHTML(content: string | null, options: EnrichmentOptionsPF2e & { async: false }): string;
    static override enrichHTML(content: string | null, options: EnrichmentOptionsPF2e): string | Promise<string>;
    static override enrichHTML(
        this: typeof TextEditor,
        content: string | null,
        options: EnrichmentOptionsPF2e = {},
    ): string | Promise<string> {
        options.secrets ??= game.user.isGM;

        // Remove tags from @Localize only enriches.
        // Those often include HTML, including <p>, and <p> tags cannot be nested.
        content = content?.replace(/^\s*<p>@Localize\[([\w.]+)\]<\/p>\s*$/, "@Localize[$1]") ?? null;

        const enriched = superEnrichHTML.apply(this, [content, options]);
        if (typeof enriched === "string" && (options.processVisibility ?? true)) {
            return TextEditorPF2e.processUserVisibility(enriched, options);
        }

        return Promise.resolve().then(async () => TextEditorPF2e.processUserVisibility(await enriched, options));
    }

    /**
     * Upstream retrieves documents from UUID links sequentially, which has a noticable load time with text containing
     * many links: retrieve every linked document at once beforehand with the faster `UUIDUtils.fromUUIDs` system helper
     * so that subsequent calls to `fromUuid` finds all documents in caches.
     */
    static override _enrichContentLinks(text: Text[], options?: EnrichmentOptions): boolean | Promise<boolean> {
        if (options?.async) {
            const documentTypes = [...CONST.DOCUMENT_LINK_TYPES, "Compendium", "UUID"];
            const pattern = new RegExp(`@(${documentTypes.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, "g");
            const uuids = text
                .map((t) => Array.from((t.textContent ?? "").matchAll(pattern)))
                .flat(2)
                .filter((m) => UUIDUtils.isCompendiumUUID(m));
            return UUIDUtils.fromUUIDs(uuids).then(() => superEnrichContentLinks.apply(this, [text, options]));
        }

        return superEnrichContentLinks.apply(this, [text, options]);
    }

    /** Replace core static method to conditionally handle parsing of inline damage rolls */
    static override async _createInlineRoll(
        match: RegExpMatchArray,
        rollData: Record<string, unknown>,
        options: EvaluateRollParams = {},
    ): Promise<HTMLAnchorElement | null> {
        const anchor = await superCreateInlineRoll.apply(this, [match, rollData, options]);
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
    static override async _onClickInlineRoll(event: MouseEvent): Promise<ChatMessage | void> {
        const anchor = event.currentTarget ?? null;
        if (!(anchor instanceof HTMLAnchorElement && anchor.dataset.formula && "damageRoll" in anchor.dataset)) {
            return superOnClickInlineRoll.apply(this, [event]);
        }

        // Get the speaker and roll data from the clicked sheet or chat message
        const sheetElem = htmlClosest(anchor, ".sheet");
        const messageElem = htmlClosest(anchor, "li.chat-message");
        const app = ui.windows[Number(sheetElem?.dataset.appid)];
        const message = game.messages.get(messageElem?.dataset.messageId ?? "");

        const [actor, rollData] = ((): [ActorPF2e | null, Record<string, unknown>] => {
            if (message?.actor) {
                return [message.actor, message.getRollData()];
            }
            if (app instanceof ActorSheetPF2e) {
                const itemId = anchor.dataset.itemId;
                return [app.actor, app.actor.items.get(itemId)?.getRollData() ?? app.actor.getRollData()];
            }
            if (app instanceof ItemSheetPF2e) {
                return [app.actor, app.item.getRollData()];
            }

            // Retrieve item/actor from anywhere via UUID
            const itemUuid = anchor.dataset.itemUuid;
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
            const traits = anchor.dataset.traits?.split(",") ?? [];
            const overrideTraits = "overrideTraits" in anchor.dataset;
            const immutable = "immutable" in anchor.dataset;
            const rollOptions = anchor.dataset.rollOptions?.split(",") ?? [];
            const domains = anchor.dataset.domains?.split(",") ?? [];
            const extraRollOptions = R.uniq(R.compact([...traits, ...rollOptions]));

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
                        ? await renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
                              glyph: getActionGlyph(item.actionCost),
                              subtitle,
                              title: item.name,
                          })
                        : anchor.dataset.name ?? item?.name ?? "";
                args.template.name = game.i18n.localize(name);

                await DamagePF2e.roll(args.template, args.context);
            }

            return;
        }

        const roll = new DamageRoll(anchor.dataset.formula, rollData, options);
        return roll.toMessage({ speaker, flavor: roll.options.flavor }, { rollMode });
    }

    static processUserVisibility(content: string, options: EnrichmentOptionsPF2e): string {
        const html = createHTMLElement("div", { innerHTML: content });
        const document = options.rollData?.actor ?? null;
        UserVisibilityPF2e.process(html, { document });

        return html.innerHTML;
    }

    static async enrichString(
        data: RegExpMatchArray,
        options: EnrichmentOptionsPF2e = {},
    ): Promise<HTMLElement | null> {
        if (data.length < 4) return null;
        const item = options.rollData?.item ?? null;
        const [_match, inlineType, paramString, inlineLabel] = data;

        switch (inlineType) {
            case "act":
                return this.#createAction(data.groups?.slug ?? "", data.groups?.options ?? "", data.groups?.label);
            case "Check": {
                const actor = options.rollData?.actor ?? item?.actor ?? null;
                return this.#createCheck({ paramString, inlineLabel, item, actor });
            }
            case "Damage":
                return this.#createDamageRoll({ paramString, rollData: options.rollData, inlineLabel });
            case "Localize":
                return this.#localize(paramString, options);
            case "Template":
                return this.#createTemplate(paramString, inlineLabel, item?.system);
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
            params.traits ||= itemData?.traits?.value?.toString() ?? "";

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
            return html;
        }
        return null;
    }

    static #parseInlineParams(
        paramString: string,
        options: { first?: string } = {},
    ): Record<string, string | undefined> | null {
        const parts = paramString.split("|");
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
                "fas fa-unlink",
                game.i18n.format("PF2E.InlineAction.Warning.UnresolvableAction", { slug }),
            );
        }

        // params
        const params = options.split(/\s+/).reduce(
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

        if (label?.trim()) {
            // label
            element.innerText = label.trim();
        } else {
            // name
            const text = document.createElement("span");
            text.innerText = variant?.name
                ? `${game.i18n.localize(action.name)} - ${game.i18n.localize(variant.name)}`
                : game.i18n.localize(action.name);
            element.appendChild(text);

            // difficulty class
            const visibility = (params["show-dc"] || "all").trim().toLowerCase();
            const showDC =
                (visibility === "all" && game.pf2e.settings.metagame.dcs) ||
                (["all", "gm"].includes(visibility) && game.user.isGM);

            // statistic
            const statistic = (params["statistic"] || params["stat"] || params["skill"])?.trim();

            if ((dc && showDC) || statistic) {
                const STATISTIC_LABELS: Record<string, string> = {
                    perception: "PF2E.PerceptionLabel",
                    ...CONFIG.PF2E.saves,
                    ...CONFIG.PF2E.skillList,
                    unarmed: "PF2E.TraitUnarmed",
                };
                element.appendChild(document.createTextNode(" "));

                const details = document.createElement("span");
                if (dc && showDC && Number.isNumeric(dc)) {
                    // (<span data-visibility="...">DC #</span> Statistic)
                    details.appendChild(document.createTextNode("("));
                    const span = document.createElement("span");
                    span.dataset["visibility"] = visibility;
                    span.innerText = game.i18n.format("PF2E.InlineAction.Check.DC", { dc });
                    details.appendChild(span);
                    const suffix = statistic
                        ? ` ${game.i18n.localize(STATISTIC_LABELS[statistic] ?? "") || statistic})`
                        : ")";
                    details.appendChild(document.createTextNode(suffix));
                } else if (dc && showDC) {
                    // (Statistic vs Defense DC)
                    const defense = game.i18n.localize(`PF2E.Check.DC.Specific.${dc}`);
                    const text = statistic
                        ? game.i18n.format("PF2E.InlineAction.Check.StatisticVsDefense", {
                              defense,
                              statistic: game.i18n.localize(STATISTIC_LABELS[statistic] ?? "") || statistic,
                          })
                        : game.i18n.format("PF2E.InlineAction.Check.VsDefense", { defense });
                    details.innerText = `(${text})`;
                } else if (statistic) {
                    // (Statistic)
                    const text = game.i18n.localize(STATISTIC_LABELS[statistic] ?? "") || statistic;
                    details.innerText = `(${text})`;
                }
                element.appendChild(details);
            }
        }

        // traits
        const traits = variant?.traits ?? action.traits;

        // traits as tooltip
        element.dataset["tooltip"] = traits
            .map((trait) => game.i18n.localize(CONFIG.PF2E.actionTraits[trait] || trait))
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

        const basic = "basic" in rawParams;
        const overrideTraits = "overrideTraits" in rawParams;
        const rawTraits = rawParams.traits?.split(",").map((t) => t.trim()) ?? [];
        const traits = R.uniq(R.compact(overrideTraits ? rawTraits : [rawTraits, item?.system.traits.value].flat()));

        const params: CheckLinkParams = {
            ...rawParams,
            type,
            basic,
            dc: rawParams.dc?.trim() || null,
            defense: rawParams.defense?.trim() || null,
            showDC,
            overrideTraits,
            traits,
            immutable: "immutable" in rawParams,
            // Set action slug, damaging effect for basic saves, and any parameterized options
            extraRollOptions: R.compact([
                ...(basic ? ["damaging-effect"] : []),
                ...(rawParams.options?.split(",").map((t) => t.trim()) ?? []),
            ]).sort(),
            targetOwner: "targetOwner" in rawParams,
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

            switch (params.type) {
                case "flat":
                    return game.i18n.localize("PF2E.FlatCheck");
                case "perception":
                    return game.i18n.localize("PF2E.PerceptionLabel");
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
                    return shortForm
                        ? game.i18n.localize(CONFIG.PF2E.skills[shortForm])
                        : params.type
                              .split("-")
                              .map((word) => {
                                  return word.slice(0, 1).toUpperCase() + word.slice(1);
                              })
                              .join(" ");
                }
            }
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
            },
        });

        if (params.defense && params.dc) {
            anchor.dataset.tooltip = localize("Invalid", { message: localize("Errors.DCAndDefense") });
            anchor.dataset.invalid = "";
        }

        if (!["flat", "fortitude", "reflex", "will"].includes(params.type) && params.defense) {
            anchor.dataset.pf2Defense = params.defense;
        }

        if (params.type && params.dc) {
            // Let the inline roll function handle level base DCs
            const checkDC = params.dc === "@self.level" ? params.dc : getCheckDC({ name, params, item, actor });
            anchor.dataset.pf2Dc = checkDC;

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
        const domains = rawParams.domains?.split(",") ?? [];

        // Verify all custom domains are valid. Don't allow any valid domains, and don't attempt to sanitize
        if (domains.some((d) => !/^[a-z][-a-z0-9]+-damage$/.test(d))) {
            ui.notifications.warn(game.i18n.format("PF2E.InlineCheck.Errors.InvalidDomains", { type: "@Damage" }));
            return null;
        }

        const immutable = "immutable" in rawParams;
        const overrideTraits = "overrideTraits" in rawParams;
        const traits = ((): string[] => {
            const fromParams = rawParams.traits?.split(",").flatMap((t) => t.trim() || []) ?? [];
            const fromItem = item?.system.traits?.value ?? [];
            return overrideTraits ? fromParams : R.uniq([...fromParams, ...fromItem]);
        })();

        const extraRollOptions = R.compact(rawParams.options?.split(",").map((t) => t.trim()) ?? []);

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
                : args.inlineLabel ?? formula;
        const labelEl = createHTMLElement("span", { children: [label] });

        const element = createHTMLElement("a", {
            classes: R.compact(["inline-roll", "roll", baseFormula && baseFormula !== formula ? "altered" : null]),
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
        const traits = R.uniq([item.system.traits.value, extra.filter((t) => t in CONFIG.PF2E.actionTraits)].flat());
        const actionCost = item.actionCost.value;

        return R.compact([
            `action:${slug}`,
            `action:cost:${actionCost}`,
            `self:action:slug:${slug}`,
            `self:action:cost:${actionCost}`,
            ...traits.map((t) => `self:action:trait:${t}`),
        ]);
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
    const { dc, type } = params;
    const base = (() => {
        if (dc?.startsWith("resolve") && (item || actor)) {
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

    if (!base) return "0";

    const getStatisticValue = (selectors: string[]): string => {
        if (actor && !params.immutable) {
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

    const idDomain = item ? `${item.id}-inline-dc` : null;
    const slugDomain = `${sluggify(name)}-inline-dc`;
    if (type === "flat") {
        return params.immutable ? base.toString() : getStatisticValue(R.compact(["inline-dc", idDomain, slugDomain]));
    } else {
        const selectors = R.compact(["all", "inline-dc", idDomain, slugDomain]);
        return getStatisticValue(selectors);
    }
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
            : R.compact(
                  [
                      kinds,
                      kinds.map((k) => `inline-${k}`),
                      item ? kinds.map((k) => `${item.id}-inline-${k}`) : null,
                      item ? kinds.map((k) => `${sluggify(item.slug ?? item.name)}-inline-${k}`) : null,
                      options.domains,
                  ].flat(),
              );

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
            firstBase.materials = R.uniq(R.compact([item.material.effects, firstBase.materials].flat()).sort());
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
            ignoredResistances: [],
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
            traits: traits?.filter((t): t is ActionTrait => t in CONFIG.PF2E.actionTraits) ?? [],
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

interface EnrichmentOptionsPF2e extends EnrichmentOptions {
    rollData?: RollDataPF2e;
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
    defense?: Maybe<string>;
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

export { TextEditorPF2e, type EnrichmentOptionsPF2e };
