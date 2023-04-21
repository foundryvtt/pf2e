import { TokenPF2e } from "@module/canvas/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { PredicatePF2e } from "@system/predication.ts";

/** Prompt the user to target a token */
class MarkTargetPrompt {
    prompt: string;

    requirements: TargetRequirements | null;

    #target?: Maybe<TokenDocumentPF2e>;

    #resolve?: (value: Maybe<TokenDocumentPF2e>) => void;

    constructor(params: PromptParameters) {
        this.prompt = params.prompt ?? "PF2E.UI.RuleElements.MarkTarget.TargetToken";
        this.requirements = params.requirements;
    }

    async resolveTarget(): Promise<Maybe<TokenDocumentPF2e | null>> {
        game.user.targets.clear();
        this.activateListeners();
        ui.notifications.info(this.prompt, { localize: true });

        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    activateListeners(): void {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const hookParams: HookParamsTargetToken = [
            "targetToken",
            (_user, token, targeted) => {
                this.#target = targeted && token instanceof TokenPF2e ? token.document : null;
                this.#resolve?.(this.#target);
            },
        ];
        Hooks.once(...hookParams);

        // Wait a limited number of seconds for the user to target a token or cancel the operation
        const cancelHandler = this.#cancelHandler(hookParams);
        document.addEventListener("keyup", cancelHandler);
        window.setTimeout(() => {
            Hooks.off(...hookParams);
            document.removeEventListener("keyup", cancelHandler);
            if (this.#target === undefined) {
                this.#resolve?.(null);
            }
        }, 15_000);
    }

    /** Generate a keyboard event handler watching for an Escape keystroke to cancel the targeting operation */
    #cancelHandler(hookParams: HookParamsTargetToken): (event: KeyboardEvent) => void {
        const handler = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            ui.notifications.info("PF2E.UI.RuleElements.MarkTarget.Timeout", { localize: true });
            Hooks.off(...hookParams);
            document.removeEventListener("keyup", handler);
        };

        return handler;
    }
}

interface PromptParameters {
    prompt: string | null;
    requirements: TargetRequirements | null;
}

interface TargetRequirements {
    label: string;
    predicate: PredicatePF2e;
}

export { MarkTargetPrompt };
