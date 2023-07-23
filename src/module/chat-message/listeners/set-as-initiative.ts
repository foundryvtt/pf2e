import { CombatantPF2e } from "@module/encounter/index.ts";
import { fontAwesomeIcon } from "@util";

/** Add a button to set a check roll as the roller's initiative */
export const SetAsInitiative = {
    listen: ($li: JQuery): void => {
        const li = $li[0];

        const message = game.messages.get(li.dataset.messageId ?? "", { strict: true });
        const { context } = message.flags.pf2e;
        if (
            message.token &&
            ((message.isAuthor && !message.blind) || game.user.isGM) &&
            (context?.type === "skill-check" || context?.type === "perception-check")
        ) {
            const btnContainer = document.createElement("span");
            btnContainer.classList.add("dmgBtn-container");
            Object.assign(btnContainer.style, {
                position: "absolute",
                right: "0",
                bottom: "1px",
            });
            const setInitiativeButton = document.createElement("button");
            setInitiativeButton.classList.add("dice-total-setInitiative-btn");
            Object.assign(setInitiativeButton.style, {
                width: "22px",
                height: "22px",
                fontSize: "10px",
                lineHeight: "1px",
            });
            setInitiativeButton.title = game.i18n.localize("PF2E.ClickToSetInitiative");
            setInitiativeButton.appendChild(fontAwesomeIcon("fa-swords", { style: "solid" }));
            btnContainer.appendChild(setInitiativeButton);
            li.querySelector(".dice-total")?.appendChild(btnContainer);

            setInitiativeButton.addEventListener("click", async (event): Promise<void> => {
                event.stopPropagation();
                const { actor, token } = message;
                if (!token) {
                    ui.notifications.error(
                        game.i18n.format("PF2E.Encounter.NoTokenInScene", {
                            actor: message.actor?.name ?? message.user?.name ?? "",
                        })
                    );
                    return;
                }
                if (!actor) return;
                const combatant = await CombatantPF2e.fromActor(actor);
                if (!combatant) return;
                const value = message.rolls.at(0)?.total ?? 0;

                await combatant.encounter.setInitiative(combatant.id, value);

                ui.notifications.info(
                    game.i18n.format("PF2E.Encounter.InitiativeSet", { actor: actor.name, initiative: value })
                );
            });
        }
    },
};
