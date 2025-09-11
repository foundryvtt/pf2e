import type { TokenPF2e } from "@module/canvas/index.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { PartyClownCar } from "@scene/token-document/clown-car.ts";
import { createHTMLElement, htmlQuery } from "@util";

export class RenderTokenHUD {
    static listen(): void {
        Hooks.on("renderTokenHUD", (_app, html, data) => {
            game.pf2e.StatusEffects.onRenderTokenHUD(html, data);

            const token = canvas.scene?.tokens.get(data._id ?? "")?.object;
            RenderTokenHUD.#addClownCarButton(html, token);

            // Remove conditions hud from army. Once Foundry supports replacing these by actor type we'll add them back in
            if (token?.actor?.isOfType("army")) {
                htmlQuery(html, ".control-icon[data-palette=effects]")?.remove();
            }
        });
    }

    /** Replace the token HUD's status effects button with one for depositing/retrieving party-member tokens.  */
    static #addClownCarButton(
        html: HTMLElement,
        token: TokenPF2e<TokenDocumentPF2e<ScenePF2e>> | null | undefined,
    ): void {
        if (!token?.actor?.isOfType("party")) return;
        const willRetrieve = token.actor.members.some((m) => m.getActiveTokens(true, true).length > 0);
        const img = document.createElement("img");
        img.src = "systems/pf2e/icons/other/enter-exit.svg";
        img.className = willRetrieve ? "retrieve" : "deposit";
        const button = createHTMLElement("button", {
            classes: ["control-icon", "clown-car"],
            dataset: { tooltip: "" },
            aria: { label: game.i18n.localize(`PF2E.Actor.Party.ClownCar.${willRetrieve ? "Retrieve" : "Deposit"}`) },
            children: [img],
        });
        button.type = "button";
        button.addEventListener("click", async () => {
            if (button.disabled) return;
            button.disabled = true;
            try {
                await new PartyClownCar(token.document).toggleState();
                const switchToDeposit = img.className === "retrieve";
                img.className = switchToDeposit ? "deposit" : "retrieve";
                const locPath = `PF2E.Actor.Party.ClownCar.${switchToDeposit ? "Deposit" : "Retrieve"}`;
                button.ariaLabel = game.i18n.localize(locPath);
            } finally {
                button.disabled = false;
            }
        });
        html.querySelector("[data-palette=effects]")?.replaceWith(button);
    }
}
