import { DamageDicePF2e, ModifierPF2e, RawDamageDice, RawModifier } from "@actor/modifiers.ts";
import { createHTMLElement, htmlQuery, htmlQueryAll, signedInteger } from "@util";
import * as R from "remeda";
import type { ChatContextFlag, ChatMessagePF2e } from "./index.ts";
import { getDamageDiceOverrideLabel, getDamageDiceValueLabel } from "@system/damage/helpers.ts";

class RollInspector extends Application {
    message: ChatMessagePF2e;

    constructor(message: ChatMessagePF2e, options: Partial<ApplicationOptions> = {}) {
        super(options);
        this.message = message;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            title: "PF2E.ChatRollDetails.Title",
            template: "systems/pf2e/templates/chat/roll-inspector.hbs",
            classes: ["roll-inspector"],
            filters: [{ inputSelector: "input[type=search]", contentSelector: ".roll-options > ul" }],
            resizable: true,
            width: 640,
            height: 480,
        };
    }

    get dice(): RawDamageDice[] {
        return this.message.flags.pf2e.dice ?? [];
    }

    get modifiers(): RawModifier[] {
        return this.message.flags.pf2e.modifiers ?? [];
    }

    override getData(): ChatRollDetailsData {
        const context = this.message.flags.pf2e.context;

        const rollOptions = R.sortBy(context?.options?.sort() ?? [], (o) => o.includes(":"));

        const dice = this.dice.map((dice) => ({
            ...dice,
            value: [getDamageDiceValueLabel(dice, { sign: true }), getDamageDiceOverrideLabel(dice)]
                .filter(R.isTruthy)
                .join(" "),
            critical:
                typeof dice.critical === "boolean"
                    ? game.i18n.localize(`PF2E.RuleEditor.General.CriticalBehavior.${dice.critical}`)
                    : null,
        }));

        const modifiers = this.modifiers.map((mod) => ({
            ...mod,
            value: signedInteger(mod.modifier),
            critical:
                typeof mod.critical === "boolean"
                    ? game.i18n.localize(`PF2E.RuleEditor.General.CriticalBehavior.${mod.critical}`)
                    : null,
        }));

        return {
            context,
            dice,
            domains: context?.domains?.sort() ?? [],
            modifiers,
            rollOptions,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        const html = $html[0];

        // Loops over all modifiers and dice
        for (const element of htmlQueryAll(html, ".modifier")) {
            const object = (() => {
                const index = Number(element.dataset.idx);
                if (element.dataset.type === "modifier") {
                    const raw = this.modifiers.at(index);
                    return raw ? new ModifierPF2e(raw) : null;
                } else {
                    const raw = this.dice.at(index);
                    return raw ? new DamageDicePF2e(raw) : null;
                }
            })();

            if (!object) continue;

            const rollOptions = R.sortBy(object.getRollOptions().sort(), (o) => o.includes(":"));

            htmlQuery(element, "h4 .fa-solid")?.addEventListener("pointerenter", () => {
                const content = createHTMLElement("ul", {
                    children: rollOptions.map((o) => createHTMLElement("li", { innerHTML: o })),
                });
                game.tooltip.dismissLockedTooltips();
                game.tooltip.activate(element, {
                    content,
                    locked: true,
                    direction: "RIGHT",
                    cssClass: "pf2e roll-options",
                });
            });
        }
    }

    /** Roll options search */
    protected override _onSearchFilter(
        _event: KeyboardEvent,
        query: string,
        _rgx: RegExp,
        html: HTMLElement | null,
    ): void {
        for (const row of htmlQueryAll(html, ":scope > li")) {
            row.hidden = query.length > 0 && !row.innerText.includes(query);
        }
    }
}

interface ChatRollDetailsData {
    context?: ChatContextFlag;
    domains: string[];
    modifiers: PreparedModifier[];
    dice: PreparedDice[];
    rollOptions: string[];
}

interface PreparedModifier extends Omit<Partial<RawModifier>, "critical"> {
    value: string;
    critical: string | null;
}

interface PreparedDice extends Omit<Partial<RawDamageDice>, "critical"> {
    value: string;
    critical: string | null;
}

export { RollInspector };
