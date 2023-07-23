import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { createSimpleFormula, parseTermsFromSimpleFormula } from "@system/damage/formula.ts";
import { ErrorPF2e } from "@util";

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
        event: MouseEvent | JQuery.TriggeredEvent;
        item?: ItemPF2e<ActorPF2e> | null;
        parts: (string | number)[];
        actor?: ActorPF2e;
        data: Record<string, unknown>;
        template?: string;
        title: string;
        speaker: foundry.documents.ChatSpeakerData;
        flavor?: Function;
        onClose?: Function;
        dialogOptions?: Partial<ApplicationOptions>;
        rollMode?: RollMode;
        rollType?: string;
    }): Promise<unknown> {
        // Inner roll function
        const userSettingQuickD20Roll = !game.user.settings.showRollDialogs;
        const _roll = async (
            rollParts: (string | string[] | number)[],
            adv: number,
            $form?: JQuery
        ): Promise<Rolled<Roll>> => {
            let flav = flavor instanceof Function ? flavor(rollParts, data) : title;
            if (adv === 1) {
                rollParts[0] = ["2d20kh"];
                flav = game.i18n.format("PF2E.Roll.FortuneTitle", { title: title });
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
            const roll = await new Roll(rollParts.join("+"), data).roll({ async: true });
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
            template = template || "systems/pf2e/templates/chat/roll-dialog.hbs";
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
                                callback: async (html) => {
                                    roll = await _roll(parts, 1, html);
                                },
                            },
                            normal: {
                                label: game.i18n.localize("PF2E.Roll.Normal"),
                                callback: async (html) => {
                                    roll = await _roll(parts, 0, html);
                                },
                            },
                            disadvantage: {
                                label: game.i18n.localize("PF2E.Roll.Misfortune"),
                                callback: async (html) => {
                                    roll = await _roll(parts, -1, html);
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
}

/**
 * Combines dice and flat values together in a condensed expression. Also repairs any + - and "- 3" errors.
 * For example, 3d4 + 2d4 + 3d6 + 5 + 2 is combined into 5d4 + 3d6 + 7. - 4 is corrected to -4.
 */
function simplifyFormula(formula: string): string {
    if (formula === "0") return formula;

    const fixedFormula = formula.replace(/^\s*-\s+/, "-").replace(/\s*\+\s*-\s*/g, " - ");
    const roll = new Roll(fixedFormula);
    if (
        !roll.terms.every((t) => [" - ", " + "].includes(t.expression) || t instanceof Die || t instanceof NumericTerm)
    ) {
        // This isn't a simple summing of dice: return the roll without further changes
        return fixedFormula;
    }

    const terms = parseTermsFromSimpleFormula(roll);
    return createSimpleFormula(terms);
}

export { DicePF2e, simplifyFormula };
