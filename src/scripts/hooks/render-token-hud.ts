import type { TokenPF2e } from "@module/canvas/index.ts";
import { PartyClownCar } from "@module/canvas/token/clown-car.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
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
        token: TokenPF2e<TokenDocumentPF2e<ScenePF2e>> | null | undefined
    ): void {
        if (!token?.actor?.isOfType("party")) return;

        const { actor } = token;
        const actionIcon = ((): HTMLImageElement => {
            const imgElement = document.createElement("img");
            imgElement.src = "systems/pf2e/icons/other/enter-exit.svg";
            const willRetrieve = actor.members.some((m) => m.getActiveTokens(true, true).length > 0);
            imgElement.className = willRetrieve ? "retrieve" : "deposit";
            imgElement.title = game.i18n.localize(
                willRetrieve ? "PF2E.Actor.Party.ClownCar.Retrieve" : "PF2E.Actor.Party.ClownCar.Deposit"
            );

            return imgElement;
        })();

        const controlButton = createHTMLElement("div", {
            classes: ["control-icon"],
            dataset: { action: "clown-car" },
            children: [actionIcon],
        });

        controlButton.addEventListener("click", async () => {
            controlButton.style.pointerEvents = "none";
            await new PartyClownCar(token.document).toggleState();
            canvas.tokens.hud.render();
        });

        htmlQuery(html, "[data-action=effects]")?.replaceWith(controlButton);
    }
}
