import { BaseRawModifier, DamageDicePF2e } from "@actor/modifiers.ts";
import { addSign } from "@util";
import { ChatMessagePF2e } from "./index.ts";
import MiniSearch from "minisearch";

class ChatRollDetails extends Application {
    readonly searchEngine: MiniSearch<string>;
    readonly allOptions: string[];
    rollOptions: string[];
    searchText = "";

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
        const { context } = this.message.flags.pf2e;
        this.allOptions = this.rollOptions = context?.options ?? [];
        this.sortRollOptions();
        this.searchEngine = new MiniSearch<string>({
            fields: ["name"],
            searchOptions: { combineWith: "AND", prefix: true },
            extractField: (document, _) => {
                return document;
            },
            storeFields: ["name"],
        });
        this.searchEngine.addAll(this.allOptions);
    }

    override getData() {
        const { context, modifiers } = this.message.flags.pf2e;
        const domains = context?.domains.sort();
        const preparedModifiers = modifiers ? this.prepareModifiers(modifiers) : [];
        return {
            context,
            domains,
            modifiers: preparedModifiers,
            rollOptions: this.rollOptions,
            hasModifiers: !!modifiers,
            searchText: this.searchText,
        };
    }

    private sortRollOptions() {
        this.rollOptions.sort((a, b) => {
            // Slightly weird js syntax: convert booleans to integers to generate a sort order from them.
            return +a.includes(":") - +b.includes(":") || a.localeCompare(b);
        });
    }

    override activateListeners($html: JQuery): void {
        const textFilter = $html.find<HTMLInputElement>(".roll-options input")[0];
        const optionsList = $html.find<HTMLInputElement>(".roll-options ul")[0];
        textFilter?.addEventListener("search", () => {
            this.searchText = textFilter.value;
            if (this.searchText) {
                this.rollOptions = this.searchEngine.search(this.searchText).map((d) => {
                    return d.name;
                });
            } else {
                this.rollOptions = this.allOptions;
            }
            this.sortRollOptions();
            const elems = this.rollOptions.map((option) => {
                const elem = document.createElement("li");
                elem.textContent = option;
                return elem;
            });
            // We replace in-place rather than calling this.render() so that we don't lose focus on the input field while somebody is actively doing incremental searches. It's fine if the dialog rerenders in other scenarios.
            optionsList.replaceChildren(...elems);
        });
    }

    protected prepareModifiers(modifiers: (BaseRawModifier | DamageDicePF2e)[]) {
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

export { ChatRollDetails };
