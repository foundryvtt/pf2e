import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { TokenDocumentPF2e } from "@scene";
import { htmlQueryAll, objectHasKey } from "@util";

class UserVisibilityPF2e {
    /** Edits HTML live based on permission settings. Used to hide certain blocks and values */
    static process(html: HTMLElement, options: ProcessOptions = {}): void {
        const visibilityElements = htmlQueryAll(html, "[data-visibility]");

        // Remove all visibility=none elements
        for (const element of visibilityElements.filter((e) => e.dataset.visibility === "none")) {
            element.remove();
        }

        // Process all other visibility elements according to originating document ownership
        const { message } = options;
        const document = options.document ?? message?.actor ?? message?.journalEntry ?? message ?? null;
        if (document) {
            const ownerElements = visibilityElements.filter((e) => e.dataset.visibility === "owner");
            for (const element of ownerElements) {
                // "owner" is generally applicable only to `data-action` buttons and anchors in chat messages
                if (element.dataset.action) {
                    if (!document.isOwner) element.remove();
                    delete element.dataset.visibility;
                    continue;
                }

                const whoseData = element.dataset.whose ?? "self";
                if (whoseData === "self") {
                    element.dataset.visibility = document.hasPlayerOwner ? "all" : "gm";
                    continue;
                }

                if (message?.target && whoseData === "target") {
                    element.dataset.visibility = message.target.actor.hasPlayerOwner ? "all" : "gm";
                }
            }
        }

        const hasOwnership = document?.isOwner ?? game.user.isGM;
        // Hide DC for explicit save buttons (such as in spell cards)
        const dcSetting = game.settings.get("pf2e", "metagame_showDC");
        const saveButtons = htmlQueryAll(html, "button[data-action=save]");
        const hideDC = !document?.hasPlayerOwner && !hasOwnership && !dcSetting;
        if (hideDC) {
            for (const button of saveButtons) {
                const saveType = button.dataset.save;
                if (objectHasKey(CONFIG.PF2E.saves, saveType)) {
                    const saveName = game.i18n.localize(CONFIG.PF2E.saves[saveType]);
                    button.innerText = game.i18n.format("PF2E.SavingThrowWithName", { saveName });
                }
            }
        } else if (!document?.hasPlayerOwner && !dcSetting) {
            for (const button of saveButtons) {
                button.classList.add("hidden-to-others");
            }
        }

        for (const element of htmlQueryAll(html, "[data-owner-title]")) {
            if (hasOwnership) {
                const value = element.dataset.ownerTitle ?? "";
                element.title = value;
            } else {
                element.removeAttribute("data-owner-title");
            }
        }

        // Remove visibility=gm elements if the user is not a GM
        if (!game.user.isGM) {
            for (const element of visibilityElements.filter((e) => e.dataset.visibility === "gm")) {
                element.remove();
            }
        }
    }

    static processMessageSender(message: ChatMessagePF2e, html: HTMLElement): void {
        // Hide the sender name from the card if it can't be seen from the canvas
        if (!game.settings.get("pf2e", "metagame_tokenSetsNameVisibility")) return;
        const token =
            message.token ?? (message.actor ? new TokenDocumentPF2e(message.actor.prototypeToken.toObject()) : null);
        if (token) {
            const sender = html.querySelector<HTMLElement>("h4.message-sender");
            const nameToHide = token.name.trim();
            const shouldHideName = !token.playersCanSeeName && sender?.innerText.trim() === nameToHide;
            if (sender && shouldHideName) {
                if (game.user.isGM) {
                    sender.dataset.visibility = "gm";
                } else {
                    sender.innerText = message.user?.name ?? "Gamemaster";
                }
            }
        }
    }
}

const USER_VISIBILITIES = new Set(["all", "owner", "gm", "none"] as const);
type UserVisibility = SetElement<typeof USER_VISIBILITIES>;

interface ProcessOptions {
    document?: ClientDocument | null;
    message?: ChatMessagePF2e | null;
}

export { USER_VISIBILITIES, type UserVisibility, UserVisibilityPF2e };
