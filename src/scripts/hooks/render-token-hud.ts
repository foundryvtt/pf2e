import type { TokenPF2e } from "@module/canvas/index.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { PartyClownCar } from "@scene/token-document/clown-car.ts";
import { createHTMLElement, htmlQuery } from "@util";

export class RenderTokenHUD {
    static listen(): void {
        Hooks.on("renderTokenHUD", (_app, $html, data) => {
            const html = $html[0];
            game.pf2e.StatusEffects.onRenderTokenHUD(html, data);

            const token = canvas.scene?.tokens.get(data._id ?? "")?.object;
            this.addClownCarButton(html, token);
        });
    }

    /** Replace the token HUD's status effects button with one for depositing/retrieving party-member tokens.  */
    static addClownCarButton(
        html: HTMLElement,
        token: TokenPF2e<TokenDocumentPF2e<ScenePF2e>> | null | undefined,
    ): void {
        if (!token?.actor?.isOfType("party")) return;

        const { actor } = token;
        const actionIcon = ((): HTMLImageElement => {
            const imgElement = document.createElement("img");
            imgElement.src = "systems/pf2e/icons/other/enter-exit.svg";
            const willRetrieve = actor.members.some((m) => m.getActiveTokens(true, true).length > 0);
            imgElement.className = willRetrieve ? "retrieve" : "deposit";
            imgElement.title = game.i18n.localize(
                willRetrieve ? "PF2E.Actor.Party.ClownCar.Retrieve" : "PF2E.Actor.Party.ClownCar.Deposit",
            );

            return imgElement;
        })();

        const controlButton = createHTMLElement("div", {
            classes: ["control-icon"],
            dataset: { action: "clown-car" },
            children: [actionIcon],
        });

        controlButton.addEventListener("click", async () => {
            if (controlButton.dataset.disabled) return;
            controlButton.dataset.disabled = "true";
            try {
                await new PartyClownCar(token.document).toggleState();
                const switchToDeposit = actionIcon.className === "retrieve";
                actionIcon.className = switchToDeposit ? "deposit" : "retrieve";
                actionIcon.title = game.i18n.localize(
                    switchToDeposit ? "PF2E.Actor.Party.ClownCar.Deposit" : "PF2E.Actor.Party.ClownCar.Retrieve",
                );
            } finally {
                delete controlButton.dataset.disabled;
            }
        });

        htmlQuery(html, "[data-action=effects]")?.replaceWith(controlButton);
    }
}
