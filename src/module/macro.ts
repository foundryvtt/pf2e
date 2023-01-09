export class MacroPF2e extends Macro {
    /** Raise permission requirement of world macro visibility to observer */
    override get visible(): boolean {
        return this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    }

    /** Allow unbound variables to be shadowed in script's evaluation scope */
    protected override _executeScript({ actor, token }: { actor?: Actor; token?: Token | null } = {}): void {
        // Add variables to the evaluation scope
        const speaker = ChatMessage.implementation.getSpeaker();
        const character = game.user.character;
        actor ??= game.actors.get(speaker.actor ?? "");
        token ??= canvas.ready ? canvas.tokens.get(speaker.token ?? "") : null;

        // Attempt script execution
        const AsyncFunction = async function () {}.constructor as { new (...args: string[]): Function };
        const command = ["{", this.command, "}"].join("\n");
        const fn = new AsyncFunction("speaker", "actor", "token", "character", command);
        try {
            return fn.call(this, speaker, actor, token, character);
        } catch {
            ui.notifications.error("There was an error in your macro syntax. See the console (F12) for details");
        }
    }
}
