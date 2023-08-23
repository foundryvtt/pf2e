import { DamageDicePF2e } from "@actor/modifiers.ts";
import { addSign, htmlQuery } from "@util";
import { ChatContextFlag, ChatMessagePF2e } from "./index.ts";
import { PredicatePF2e, RawPredicate } from "@system/predication.ts";

class ChatInspectRoll extends Application {
    #currentFilter = "";

    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.title = "PF2E.ChatRollDetails.Title";
        options.template = "systems/pf2e/templates/chat/chat-inspect-roll.hbs";
        options.classes = ["chat-inspect-roll"];
        options.resizable = true;
        options.width = 600;
        options.height = 420;
        return options;
    }

    constructor(private message: ChatMessagePF2e, options: Partial<ApplicationOptions> = {}) {
        super(options);
    }

    override getData(): ChatRollDetailsData {
        const { context } = this.message.flags.pf2e;
        const domains = context?.domains?.sort();

        const modifiers = this.prepareModifiers();

        return {
            context,
            domains,
            modifiers: modifiers ?? [],
            hasModifiers: !!modifiers,
        };
    }

    protected prepareModifiers(): PreparedModifier[] | null {
        const modifiers = this.message.flags.pf2e.modifiers?.map((mod) => {
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

        return modifiers ?? null;
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        this.filterOptions(this.#currentFilter);
        const filterInput = htmlQuery<HTMLInputElement>(html, "input.filter");
        filterInput?.addEventListener("input", () => {
            this.#currentFilter = filterInput.value?.trim();
            this.filterOptions(this.#currentFilter);
        });
    }

    filterOptions(filter: string): void {
        const html = this.element[0];

        const { context } = this.message.flags.pf2e;
        const allOptions = context?.options ?? [];
        const topLevelOptions = allOptions.filter((option) => !option.includes(":"));
        const remainingOptions = allOptions.filter((option) => option.includes(":"));
        const rollOptions = [...topLevelOptions.sort(), ...remainingOptions.sort()];
        const filteredOptions = filter ? rollOptions.filter((r) => r.includes(filter)) : rollOptions;

        const template = htmlQuery(html, "template.roll-option-template")?.innerHTML;
        const content = Handlebars.compile(template)({ rollOptions: filteredOptions });
        const destination = htmlQuery(html, ".roll-option-lists");
        if (destination) {
            destination.innerHTML = content;
        }
    }
}

interface ChatRollDetailsData {
    context?: ChatContextFlag;
    domains?: string[];
    modifiers: PreparedModifier[];
    hasModifiers: boolean;
}

interface PreparedModifier extends Omit<Partial<DamageDicePF2e>, "critical" | "predicate"> {
    critical: string | null;
    predicate?: RawPredicate | PredicatePF2e;
}

export { ChatInspectRoll };
