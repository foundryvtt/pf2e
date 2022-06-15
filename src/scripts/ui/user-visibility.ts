import { ActorPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";
import { objectHasKey } from "@util";

const UserVisibilityPF2e = {
    /** Edits HTML live based on permission settings. Used to hide certain blocks and values */
    process: ($html: JQuery, options: ProcessOptions = {}) => {
        const visibilityElements = Array.from($html[0].querySelectorAll<HTMLElement>("[data-visibility]"));

        // Remove all visibility=none elements
        for (const element of visibilityElements.filter((e) => e.dataset.visibility === "none")) {
            element.remove();
        }

        // Process all other visibility elements according to originating document ownership
        const { message } = options;
        const document = options.actor ?? message?.actor ?? message?.journalEntry ?? null;
        if (document) {
            const elements = visibilityElements.filter((e) => e.dataset.visibility === "owner");
            for (const element of elements) {
                const whoseData = element.dataset.whose ?? "self";
                if (whoseData === "self") {
                    element.dataset.visibility = document.hasPlayerOwner ? "all" : "gm";
                    continue;
                }

                if (message?.target && whoseData === "target") {
                    element.dataset.visibility = message.target.actor.hasPlayerOwner ?? true ? "all" : "gm";
                }
            }
        }

        const hasOwnership = document?.isOwner ?? game.user.isGM;
        // Hide DC for explicit save buttons (such as in spell cards)
        const dcSetting = game.settings.get("pf2e", "metagame.showDC");
        const $saveButtons = $html.find("button[data-action=save]");
        const hideDC =
            !document?.hasPlayerOwner &&
            ((dcSetting === "owner" && !hasOwnership) ||
                (dcSetting === "gm" && !game.user.isGM) ||
                dcSetting === "none");
        if (hideDC) {
            $saveButtons.each((_idx, elem) => {
                const saveType = elem.dataset.save;
                if (objectHasKey(CONFIG.PF2E.saves, saveType)) {
                    const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
                    elem.innerText = game.i18n.format("PF2E.SavingThrowWithName", { saveName });
                }
            });
        } else if (!document?.hasPlayerOwner && dcSetting !== "all") {
            $saveButtons.each((_idx, elem) => {
                $(elem).addClass("hidden-to-others");
            });
        }

        $html.find("[data-owner-title]").each((_idx, element) => {
            if (hasOwnership) {
                const value = element.dataset.ownerTitle!;
                element.setAttribute("title", value);
            } else {
                element.removeAttribute("data-owner-title");
            }
        });

        // Remove visibility=gm elements if the user is not a GM
        if (!game.user.isGM) {
            for (const element of visibilityElements.filter((e) => e.dataset.visibility === "gm")) {
                element.remove();
            }
        }

        // Hide the sender name from the card if it can't be seen from the canvas
        const tokenSetsNameVisibility = game.settings.get("pf2e", "metagame.tokenSetsNameVisibility");
        if (message?.token && tokenSetsNameVisibility) {
            const $sender = $html.find("h4.message-sender");
            const nameToHide = message.token.name.trim();
            const shouldHideName = !message.token.playersCanSeeName && $sender.text().trim() === nameToHide;
            if (shouldHideName) {
                if (game.user.isGM) {
                    $sender.attr({ "data-visibility": "gm" });
                } else {
                    $sender.text(message.user?.name ?? "Gamemaster");
                }
            }
        }
    },
};

type UserVisibility = "all" | "owner" | "gm" | "none";

interface ProcessOptions {
    message?: ChatMessagePF2e;
    actor?: ActorPF2e | null;
}

export { UserVisibilityPF2e, UserVisibility };
