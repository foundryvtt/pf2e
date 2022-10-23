import { ChatMessagePF2e } from ".";

class ChatRollDetails extends Application {
    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.title = "PF2E.ChatRollDetails.Title";
        options.template = "systems/pf2e/templates/chat/chat-roll-details.html";
        options.classes = ["chat-roll-details"];
        options.resizable = true;
        options.width = 600;
        options.height = 420;
        return options;
    }

    constructor(private message: ChatMessagePF2e, options: Partial<ApplicationOptions> = {}) {
        super(options);
    }

    override getData() {
        const { context, modifiers } = this.message.flags.pf2e;
        const allOptions = context?.options ?? [];
        const topLevelOptions = allOptions.filter((option) => !option.includes(":"));
        const remainingOptions = allOptions.filter((option) => option.includes(":"));
        const rollOptions = [...topLevelOptions.sort(), ...remainingOptions.sort()];
        const domains = context?.domains.sort();
        return { context, domains, modifiers, rollOptions };
    }
}

export { ChatRollDetails };
