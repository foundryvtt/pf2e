import { RawDamageDice, RawModifier } from "@actor/modifiers.ts";
import { htmlQueryAll, signedInteger } from "@util";
import { ChatContextFlag, ChatMessagePF2e } from "./index.ts";

class RollInspector extends Application {
    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            title: "PF2E.ChatRollDetails.Title",
            template: "systems/pf2e/templates/chat/roll-inspector.hbs",
            classes: ["roll-inspector"],
            filters: [{ inputSelector: "input[type=search]", contentSelector: ".roll-options > ul" }],
            resizable: true,
            width: 600,
            height: 420,
        };
    }

    constructor(
        private message: ChatMessagePF2e,
        options: Partial<ApplicationOptions> = {},
    ) {
        super(options);
    }

    override getData(): ChatRollDetailsData {
        const { context } = this.message.flags.pf2e;

        const rollOptions = ((): string[] => {
            const allOptions = context?.options ?? [];
            const topLevelOptions = allOptions.filter((option) => !option.includes(":"));
            const remainingOptions = allOptions.filter((option) => option.includes(":"));
            return [...topLevelOptions.sort(), ...remainingOptions.sort()];
        })();

        const modifiers =
            this.message.flags.pf2e.modifiers?.map((mod) => ({
                ...mod,
                value: signedInteger(mod.modifier),
                critical:
                    typeof mod.critical === "boolean"
                        ? game.i18n.localize(`PF2E.RuleEditor.General.CriticalBehavior.${mod.critical}`)
                        : null,
            })) ?? [];

        const dice =
            this.message.flags.pf2e.dice?.map((dice) => ({
                ...dice,
                value: `+${dice.diceNumber}${dice.dieSize}`,
                critical:
                    typeof dice.critical === "boolean"
                        ? game.i18n.localize(`PF2E.RuleEditor.General.CriticalBehavior.${dice.critical}`)
                        : null,
            })) ?? [];

        return {
            context,
            domains: context?.domains?.sort() ?? [],
            modifiers,
            dice,
            rollOptions,
        };
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
