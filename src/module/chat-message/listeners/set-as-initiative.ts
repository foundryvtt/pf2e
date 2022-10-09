/** Add a button to set a check roll as the roller's initiative */
export const SetAsInitiative = {
    listen: ($li: JQuery) => {
        const message = game.messages.get($li.attr("data-message-id") ?? "", { strict: true });
        const { context } = message.flags.pf2e;
        if (
            message.token &&
            (message.isAuthor || game.user.isGM) &&
            (context?.type === "skill-check" || context?.type === "perception-check")
        ) {
            const btnStyling = "width: 22px; height:22px; font-size:10px;line-height:1px";
            const initiativeButtonTitle = game.i18n.localize("PF2E.ClickToSetInitiative");
            const setInitiativeButton = $(
                `<button class="dice-total-setInitiative-btn" style="${btnStyling}"><i class="fa-solid fa-swords" title="${initiativeButtonTitle}"></i></button>`
            );
            const btnContainer = $(
                '<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>'
            );
            btnContainer.append(setInitiativeButton);
            const $diceTotal = $li.find(".dice-total");
            $diceTotal.append(btnContainer);

            setInitiativeButton.on("click", () => {
                message.token?.setInitiative({ initiative: message.rolls.at(0)?.total ?? 0 });
            });
        }
    },
};
