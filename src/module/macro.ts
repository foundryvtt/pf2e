import { TokenPF2e } from "./canvas/index.ts";
import { ActorPF2e } from "./documents.ts";

export class MacroPF2e extends Macro {
    /** Raise permission requirement of world macro visibility to observer */
    override get visible(): boolean {
        return this.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    }

    /** Wrap script `command` in curly braces to place macro-execution parameters in outer scope  */
    override execute(scope?: { actor?: ActorPF2e; token?: TokenPF2e } | undefined): unknown {
        if (this.type !== "script") return super.execute(scope);

        const originalCommand = this.command;
        this.command = ["{", this.command, "}"].join("\n");
        const result = super.execute(scope);
        this.command = originalCommand;

        return result;
    }
}
