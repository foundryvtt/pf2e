import type { TokenPF2e } from "@module/canvas/index.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { createHTMLElement, htmlQuery } from "@util";
import * as R from "remeda";

export const RenderTokenHUD = {
    listen: (): void => {
        Hooks.on("renderTokenHUD", (_app, $html, data) => {
            const html = $html[0];
            game.pf2e.StatusEffects.onRenderTokenHUD(html, data);

            const token = canvas.scene?.tokens.get(data._id ?? "")?.object;
            RenderTokenHUD.addClownCarButton(html, token);
        });
    },

    /** Replace the token HUD's status effects button with one for depositing/retrieving party-member tokens.  */
    addClownCarButton: (html: HTMLElement, token: TokenPF2e<TokenDocumentPF2e<ScenePF2e>> | null | undefined): void => {
        if (!token?.actor?.isOfType("party")) return;

        const { actor, scene } = token;
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
            const memberTokensIds = R.uniq(
                actor.members.flatMap((m) => m.getActiveTokens(true, true)).map((t) => t.id)
            );

            if (memberTokensIds.length > 0) {
                await scene.deleteEmbeddedDocuments("Token", memberTokensIds);
            } else {
                const distance = canvas.dimensions?.size ?? 100;
                const newTokens = (
                    await Promise.all(
                        actor.members.map((m, index) =>
                            m.getTokenDocument({
                                x: token.document.x + (index + 1) * distance,
                                y: token.document.y,
                            })
                        )
                    )
                ).map((t) => t.toObject());
                await scene.createEmbeddedDocuments("Token", newTokens);
            }
            canvas.tokens.hud.render();
        });

        htmlQuery(html, "[data-action=effects]")?.replaceWith(controlButton);
    },
};
