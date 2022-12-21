import { ActorPF2e } from "@actor";
import { ItemPF2e, SpellPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { ErrorPF2e } from "@util";
import { eventToRollParams } from "./sheet-util";

/**
 * @category Other
 */
class DicePF2e {
    _rolled?: boolean;
    terms?: string[];

    /**
     * A standardized helper function for managing core PF2e "d20 rolls"
     *
     * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
     * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
     *
     * @param event         The triggering event which initiated the roll
     * @param parts         The dice roll component parts, excluding the initial d20
     * @param actor         The Actor making the d20 roll
     * @param data          Actor or item data against which to parse the roll
     * @param template      The HTML template used to render the roll dialog
     * @param title         The dice roll UI window title
     * @param speaker       The ChatMessage speaker to pass when creating the chat
     * @param flavor        A callable function for determining the chat message flavor given parts and data
     * @param advantage     Allow rolling with advantage (and therefore also with disadvantage)
     * @param situational   Allow for an arbitrary situational bonus field
     * @param fastForward   Allow fast-forward advantage selection
     * @param onClose       Callback for actions to take when the dialog form is closed
     * @param dialogOptions Modal dialog options
     */
    static async d20Roll({
        event,
        item = null,
        parts,
        data,
        template,
        title,
        speaker,
        flavor,
        onClose,
        dialogOptions,
        rollMode = game.settings.get("core", "rollMode"),
        rollType = "",
    }: {
        event: JQuery.Event;
        item?: Embedded<ItemPF2e> | null;
        parts: (string | number)[];
        actor?: ActorPF2e;
        data: Record<string, unknown>;
        template?: string;
        title: string;
        speaker: foundry.data.ChatSpeakerSource;
        flavor?: Function;
        onClose?: Function;
        dialogOptions?: Partial<ApplicationOptions>;
        rollMode?: RollMode;
        rollType?: string;
    }) {
        // Inner roll function
        const userSettingQuickD20Roll = !game.user.settings.showRollDialogs;
        const _roll = (rollParts: (string | string[] | number)[], adv: number, $form?: JQuery) => {
            let flav = flavor instanceof Function ? flavor(rollParts, data) : title;
            if (adv === 1) {
                rollParts[0] = ["2d20kh"];
                flav = game.i18n.format("PF2E.Roll.MisfortuneTitle", { title: title });
            } else if (adv === -1) {
                rollParts[0] = ["2d20kl"];
                flav = game.i18n.format("PF2E.Roll.MisfortuneTitle", { title: title });
            }

            // Don't include situational bonuses unless they are defined
            if ($form) data.itemBonus = $form.find("[name=itemBonus]").val();
            if ((!data.itemBonus || data.itemBonus === 0) && rollParts.indexOf("@itemBonus") !== -1)
                rollParts.splice(rollParts.indexOf("@itemBonus"), 1);
            if ($form) data.statusBonus = $form.find("[name=statusBonus]").val();
            if ((!data.statusBonus || data.statusBonus === 0) && rollParts.indexOf("@statusBonus") !== -1)
                rollParts.splice(rollParts.indexOf("@statusBonus"), 1);
            if ($form) data.circumstanceBonus = $form.find("[name=circumstanceBonus]").val();
            if (
                (!data.circumstanceBonus || data.circumstanceBonus === 0) &&
                rollParts.indexOf("@circumstanceBonus") !== -1
            )
                rollParts.splice(rollParts.indexOf("@circumstanceBonus"), 1);
            // Execute the roll and send it to chat
            const roll = new Roll(rollParts.join("+"), data).roll({ async: false });
            const origin = item ? { uuid: item.uuid, type: item.type } : null;
            roll.toMessage(
                {
                    speaker,
                    flavor: flav,
                    flags: {
                        pf2e: {
                            context: {
                                type: rollType,
                            },
                            origin,
                        },
                    },
                },
                {
                    rollMode: $form ? ($form.find("[name=rollMode]").val() as RollMode) : rollMode,
                }
            );
            return roll;
        };

        // Modify the roll and handle fast-forwarding
        parts.unshift("1d20");
        if (
            (userSettingQuickD20Roll && !event.altKey && !(event.ctrlKey || event.metaKey) && !event.shiftKey) ||
            (!userSettingQuickD20Roll && event.shiftKey)
        ) {
            return _roll(parts, 0);
        } else if (event.ctrlKey || event.metaKey) {
            rollMode = "blindroll"; // Forcing blind roll on control (or meta) click
            return _roll(parts, 0);
        } else if (event.shiftKey || !userSettingQuickD20Roll) {
            if (parts.indexOf("@circumstanceBonus") === -1) parts = parts.concat(["@circumstanceBonus"]);
            if (parts.indexOf("@itemBonus") === -1) parts = parts.concat(["@itemBonus"]);
            if (parts.indexOf("@statusBonus") === -1) parts = parts.concat(["@statusBonus"]);

            // Render modal dialog
            template = template || "systems/pf2e/templates/chat/roll-dialog.html";
            const dialogData = {
                data,
                rollMode,
                formula: parts.join(" + "),
                rollModes: CONFIG.Dice.rollModes,
            };
            const content = await renderTemplate(template, dialogData);
            let roll: Roll;
            return new Promise((resolve) => {
                new Dialog(
                    {
                        title,
                        content,
                        buttons: {
                            advantage: {
                                label: game.i18n.localize("PF2E.Roll.Fortune"),
                                callback: (html) => {
                                    roll = _roll(parts, 1, html);
                                },
                            },
                            normal: {
                                label: game.i18n.localize("PF2E.Roll.Normal"),
                                callback: (html) => {
                                    roll = _roll(parts, 0, html);
                                },
                            },
                            disadvantage: {
                                label: game.i18n.localize("PF2E.Roll.Misfortune"),
                                callback: (html) => {
                                    roll = _roll(parts, -1, html);
                                },
                            },
                        },
                        default: game.i18n.localize("PF2E.Roll.Normal"),
                        close: (html) => {
                            if (onClose) onClose(html, parts, data);
                            resolve(roll);
                        },
                    },
                    dialogOptions
                ).render(true);
            });
        } else {
            return _roll(parts, 0);
        }
    }

    /** A standardized helper function for managing PF2e damage rolls */
    static async damageRoll({
        event,
        actor = null,
        item = null,
        parts,
        data,
        title,
        flavor,
        simplify = false,
    }: {
        event: JQuery.ClickEvent;
        actor?: ActorPF2e | null;
        item?: Embedded<ItemPF2e> | null;
        partsCritOnly?: (string | number)[];
        parts: (string | number)[];
        data: Record<string, unknown>;
        title: string;
        flavor?: Function;
        critical?: boolean;
        simplify?: boolean;
    }): Promise<Rolled<Roll> | null> {
        // Inner roll function
        const speaker = ChatMessagePF2e.getSpeaker({ actor });
        const rollMode = eventToRollParams(event).rollMode ?? "publicroll";
        const formula = simplify ? combineTerms(Roll.replaceFormulaData(parts.join("+"), data)) : parts.join("+");
        const roll = new Roll(formula, data);
        const flav = flavor instanceof Function ? flavor(parts, data) : title;
        const traits = item?.isOfType("spell") ? this.getTraitMarkup(item) : "";
        const origin = item ? { uuid: item.uuid, type: item.type } : null;

        const message = await roll.toMessage(
            {
                speaker,
                flavor: `${flav}\n${traits}`,
                flags: { pf2e: { origin } },
            },
            { rollMode }
        );

        // Return the Roll object
        return message.rolls[0];
    }

    alter(add: number, multiply: number): this {
        const rgx = new RegExp(DiceTerm.REGEXP, "g");
        if (this._rolled) throw ErrorPF2e("You may not alter a Roll which has already been rolled");

        // Update dice roll terms
        this.terms = this.terms?.map((t) =>
            t.replace(rgx, (_match, nd, d, mods) => {
                nd = nd * (multiply || 1) + (add || 0);
                mods = mods || "";
                return `${nd}d${d}${mods}`;
            })
        );

        return this;
    }

    private static getTraitMarkup(spell: SpellPF2e): string {
        const allSpellTraits = {
            ...CONFIG.PF2E.magicSchools,
            ...CONFIG.PF2E.magicTraditions,
            ...CONFIG.PF2E.spellTraits,
        };
        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
        const traits = [...spell.traits]
            .map((trait) => ({
                value: trait,
                label: game.i18n.localize(allSpellTraits[trait]),
                description: traitDescriptions[trait] ?? "",
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((trait) =>
                $("<span>")
                    .addClass("tag")
                    .attr({ "data-trait": trait.value, "data-description": trait.description })
                    .text(trait.label)
            )
            .reduce(
                ($traits, $trait) => $traits.append($trait),
                $("<div>").addClass("item-properties").addClass("tags")
            );
        return traits.prop("outerHTML");
    }
}

/** Sum constant values and combine alike dice into single `NumericTerm` and `Die` terms, respectively */
function combineTerms(formula: string): string {
    if (formula === "0") return formula;

    const roll = new Roll(formula);
    if (!roll.terms.every((t) => t.expression === " + " || t instanceof Die || t instanceof NumericTerm)) {
        // This isn't a simple summing of dice: return the roll unaltered
        return roll.formula;
    }
    const dice = roll.terms.filter((term): term is Die => term instanceof Die);
    const diceByFaces = dice.reduce((counts: Record<number, number>, die) => {
        counts[die.faces] = (counts[die.faces] ?? 0) + die.number;
        return counts;
    }, {});
    const stringTerms = [4, 6, 8, 10, 12, 20].reduce((terms: string[], faces) => {
        return typeof diceByFaces[faces] === "number" ? [...terms, `${diceByFaces[faces]}d${faces}`] : terms;
    }, []);
    const numericTerms = roll.terms.filter((term): term is NumericTerm => term instanceof NumericTerm);
    const constant = numericTerms.reduce((runningTotal, term) => runningTotal + term.number, 0);

    return new Roll([...stringTerms, constant].filter((term) => term !== 0).join("+")).formula;
}

export { DicePF2e, combineTerms };
