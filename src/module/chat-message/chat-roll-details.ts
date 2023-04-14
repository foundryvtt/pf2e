import { BaseRawModifier, DamageDicePF2e } from "@actor/modifiers.ts";
import { addSign } from "@util";
import { ChatContextFlag, ChatMessagePF2e } from "./index.ts";
import { PredicatePF2e, RawPredicate } from "@system/predication.ts";

class ChatRollDetails extends Application {
    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.title = "PF2E.ChatRollDetails.Title";
        options.template = "systems/pf2e/templates/chat/chat-roll-details.hbs";
        options.classes = ["chat-roll-details"];
        options.resizable = true;
        options.width = 600;
        options.height = 420;
        return options;
    }

    constructor(private message: ChatMessagePF2e, options: Partial<ApplicationOptions> = {}) {
        super(options);
    }

    override getData(): ChatRollDetailsData {
        const { context, modifiers } = this.message.flags.pf2e;
        const allOptions = context?.options ?? [];
        const topLevelOptions = allOptions.filter((option) => !option.includes(":"));
        const remainingOptions = allOptions.filter((option) => option.includes(":"));
        const rollOptions = [...topLevelOptions.sort(), ...remainingOptions.sort()];
        const domains = context?.domains.sort();
        const preparedModifiers = modifiers ? this.prepareModifiers(modifiers) : [];
        return { context, domains, modifiers: preparedModifiers, rollOptions, hasModifiers: !!modifiers };
    }

    protected prepareModifiers(modifiers: (BaseRawModifier | DamageDicePF2e)[]): PreparedModifier[] {
        return modifiers.map((mod) => {
            const value = "dieSize" in mod ? `+${mod.diceNumber}${mod.dieSize}` : addSign(mod.modifier ?? 0);

            return {
                ...mod,
                value,
                critical:
                    mod.critical !== null
                        ? game.i18n.localize(`PF2E.RuleEditor.General.CriticalBehavior.${mod.critical}`)
                        : null,
            };
        });
    }
}

interface ChatRollDetailsData {
    context?: ChatContextFlag;
    domains?: string[];
    modifiers: PreparedModifier[];
    rollOptions: string[];
    hasModifiers: boolean;
}

interface PreparedModifier extends Omit<Partial<DamageDicePF2e>, "critical" | "predicate"> {
    critical: string | null;
    predicate?: RawPredicate | PredicatePF2e;
}

export { ChatRollDetails };
