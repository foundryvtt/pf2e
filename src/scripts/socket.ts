import { PartyPF2e } from "@actor";
import { ItemTransfer, ItemTransferData } from "@actor/item-transfer.ts";
import { CheckPF2e, RerollOptions } from "@system/check/check.ts";
import { ErrorPF2e } from "@util";

function activateSocketListener(): void {
    game.socket.on("system.pf2e", async (...[message, userId]: PF2eSocketEventParams) => {
        const sender = game.users.get(userId, { strict: true });
        switch (message.request) {
            case "itemTransfer":
                if (game.user.isGM) {
                    console.debug(`PF2e System | Received item-transfer request from ${sender.name}`);
                    const { data } = message;
                    const transfer = new ItemTransfer(data.source, data.target, data.quantity, data.containerId);
                    transfer.enact(sender);
                }
                break;
            case "refreshSceneControls":
                if (!game.user.isGM && message.data.layer === ui.controls.control?.layer) {
                    console.debug("PF2e System | Refreshing Scene Controls");
                    ui.controls.initialize({ layer: message.data.layer });
                }
                break;
            case "showSheet": {
                const document = await fromUuid(message.document);
                if (!sender.isGM || !document) return;

                const { tab, campaign } = message.options ?? {};

                // If campaign is defined, defer to the party's campaign model
                if (campaign) {
                    if (!(document instanceof PartyPF2e)) return;
                    const type = campaign === true ? null : campaign;
                    return document.campaign?.renderSheet?.({ tab, type });
                }

                document.sheet.render(true, { tab } as RenderOptions);

                break;
            }
            case "rerollCheckFromMessage": {
                const { messageId, recipientId, options, rerollFailed } = message;
                // Ignore if the message is not for the current user
                if (recipientId !== game.userId) {
                    return;
                }
                // A previous request has failed
                if (rerollFailed) {
                    return ui.notifications.warn(
                        game.i18n.format("PF2E.Check.Reroll.FailedSocketMessage", {
                            user: sender.name,
                            messageId,
                        })
                    );
                }
                // Reroll if possible
                if (!sender.isGM) return;
                const chatMessage = game.messages.get(messageId);
                if (chatMessage && CheckPF2e.canRerollFromMessage(chatMessage)) {
                    await CheckPF2e.rerollFromMessage(chatMessage, options);
                    return;
                }
                // The message doesn't exists or the check is no longer cached. Broadcast failure.
                game.socket.emit("system.pf2e", {
                    request: "rerollCheckFromMessage",
                    messageId,
                    recipientId: userId,
                    rerollFailed: true,
                } satisfies SocketMessage);

                break;
            }
            default:
                throw ErrorPF2e(`Received unrecognized socket emission: ${message.request}`);
        }
    });
}

interface TransferCallbackMessage {
    request: "itemTransfer";
    data: ItemTransferData;
}

interface RefreshControlsMessage {
    request: "refreshSceneControls";
    data: { layer?: string };
}

interface ShowSheetMessage {
    request: "showSheet";
    users: string[];
    document: string;
    options?: {
        /** Whether to show a campaign sheet instead, and which one */
        campaign?: boolean | "builder";
        tab?: string;
    };
}

interface RerollCheckFromMessage {
    request: "rerollCheckFromMessage";
    recipientId: string;
    messageId: string;
    options?: RerollOptions;
    rerollFailed?: boolean;
}

type SocketMessage =
    | TransferCallbackMessage
    | RefreshControlsMessage
    | ShowSheetMessage
    | RerollCheckFromMessage
    | { request?: never };
type PF2eSocketEventParams = [message: SocketMessage, userId: string];

export { activateSocketListener, type SocketMessage };
