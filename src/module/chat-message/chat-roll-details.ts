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
        const { context, modifiers } = this.message.data.flags.pf2e;
        const rollOptions = [...(context?.options ?? [])].sort();
        return { context, modifiers, rollOptions };
    }
}

export { ChatRollDetails };
