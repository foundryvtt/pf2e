import { SkillLongForm } from "@actor/types";
import { SKILL_LONG_FORMS } from "@actor/values";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter";
import { fontAwesomeIcon, setHasElement } from "@util";

/** Add a button to set a check roll as the roller's initiative */
export const SetAsInitiative = {
    listen: ($li: JQuery) => {
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
                if (!game.combat) {
                    ui.notifications.error(game.i18n.localize("PF2E.Encounter.NoActiveEncounter"));
                    return;
                }
                const actor = message.token?.actor;
                if (!actor) return;

                const combatant = ((): CombatantPF2e<EncounterPF2e> | null => {
                    const existing = game.combat.combatants.find((c) => c.actor === actor);
                    if (existing) return existing;
                    ui.notifications.error(game.i18n.format("PF2E.Encounter.NotParticipating", { actor: actor.name }));
                    return null;
                })();
                if (!combatant) return;

                const statistic =
                    message.flags.pf2e.context?.domains.find(
                        (s): s is SkillLongForm | "perception" =>
                            setHasElement(SKILL_LONG_FORMS, s) || s === "perception"
                    ) ?? null;
                const value = message.rolls[0].total;

                await game.combat.setMultipleInitiatives([
                    {
                        id: combatant.id,
                        value,
                        statistic,
                    },
                ]);
                ui.notifications.info(
                    game.i18n.format("PF2E.Encounter.InitiativeSet", { actor: actor.name, initiative: value })
                );
            });
        }
    },
};
