import { ChatMessagePF2e } from "./index.ts";

export class CriticalHitAndFumbleCards {
    private static rollTypes = ["attack-roll", "spell-attack-roll"];
    private static diceSoNice: boolean;
    private static appendButtonsOption: boolean;

    static handleDraw(message: ChatMessagePF2e): void {
        if (message.isAuthor && message.isContentVisible) {
            const type = message.flags.pf2e.context?.type ?? "";
            const firstDie = message.rolls.at(0)?.dice[0];
            if (firstDie && firstDie.faces === 20 && this.rollTypes.includes(type)) {
                if (firstDie.total === 20) {
                    this.automaticDraw("critTable");
                } else if (firstDie.total === 1) {
                    this.automaticDraw("fumbleTable");
                }
            }
        }
    }

    private static automaticDraw(table: "critTable" | "fumbleTable"): void {
        this.diceSoNice ??= !!game.modules.get("dice-so-nice")?.active;
        if (this.diceSoNice) {
            // Wait for the Dice So Nice roll to complete
            Hooks.once("diceSoNiceRollComplete", () => {
                this.drawFromTable(table, true);
            });
        } else {
            this.drawFromTable(table, true);
        }
    }

    private static drawFromTable(table: "critTable" | "fumbleTable", automatic = false): void {
        const tableId = table === "critTable" ? "FTEpsIWWVrDj0jNG" : "WzMGWMIrrPvSp75D";
        game.packs
            .get<CompendiumCollection<RollTable>>("pf2e.rollable-tables", { strict: true })
            .getDocument(tableId)
            .then((rollTable) => {
                rollTable!.draw({ displayChat: false }).then((draw) => {
                    const data: { roll: Roll; messageData: Partial<foundry.documents.ChatMessageSource> } = {
                        roll: draw.roll,
                        messageData: {},
                    };
                    if (automatic && !this.diceSoNice) {
                        data.messageData.sound = undefined;
                    }
                    rollTable!.toMessage(draw.results, data);
                });
            });
    }

    static appendButtons(message: ChatMessagePF2e, $html: JQuery): void {
        this.appendButtonsOption ??= game.settings.get("pf2e", "critFumbleButtons");
        if (this.appendButtonsOption && (message.isAuthor || game.user.isGM) && message.isContentVisible) {
            const type = message.flags.pf2e.context?.type ?? "";
            if (this.rollTypes.includes(type)) {
                const critButton = $(
                    `<button class="dice-total-fullDamage-btn" style="width: 22px; height:22px; font-size:10px;line-height:1px"><i class="fas fa-thumbs-up" title="${game.i18n.localize(
                        "PF2E.CriticalHitCardButtonTitle"
                    )}"></i></button>`
                );
                const fumbleButton = $(
                    `<button class="dice-total-fullDamage-btn" style="width: 22px; height:22px; font-size:10px;line-height:1px"><i class="fas fa-thumbs-down" title="${game.i18n.localize(
                        "PF2E.CriticalFumbleCardButtonTitle"
                    )}"></i></button>`
                );
                const btnContainer1 = $(
                    `<span class="dmgBtn-container" style="position:absolute; right:0; bottom:1px;"></span>`
                );
                btnContainer1.append(critButton);
                btnContainer1.append(fumbleButton);

                critButton.on("click", (event) => {
                    event.stopPropagation();
                    this.drawFromTable("critTable");
                    event.currentTarget.blur();
                });

                fumbleButton.on("click", (event) => {
                    event.stopPropagation();
                    this.drawFromTable("fumbleTable");
                    event.currentTarget.blur();
                });

                $html.find(".dice-total").wrapInner('<span id="value"></span>').append(btnContainer1);
            }
        }
    }
}
