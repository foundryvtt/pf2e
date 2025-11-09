import { PartyPF2e } from "@actor";
import { ItemTransfer, ItemTransferData } from "@actor/item-transfer.ts";
import type { AppV1RenderOptions } from "@client/appv1/api/application-v1.d.mts";
import { ErrorPF2e } from "@util";

function activateSocketListener(): void {
    game.socket.on("system.pf2e", async (...[message, userId]: PF2eSocketEventParams) => {
        const sender = game.users.get(userId, { strict: true });
        switch (message.request) {
            case "itemTransfer":
                if (game.user.isGM) {
                    console.debug(`PF2e System | Received item-transfer request from ${sender.name}`);
                    const transfer = new ItemTransfer(message.data);
                    transfer.enact(sender);
                }
                break;
            case "refreshSceneControls":
                if (!game.user.isGM && message.data.layer === ui.controls.control?.name) {
                    console.debug("PF2e System | Refreshing Scene Controls");
                    ui.controls.render();
                }
                break;
            case "showSheet": {
                const document = await fromUuid(message.document);
                if (!sender.isGM || !document?.sheet) return;

                // If campaign is defined, defer to the party's campaign model
                const { tab, campaign } = message.options ?? {};
                if (campaign) {
                    if (!(document instanceof PartyPF2e)) return;
                    const type = campaign === true ? null : campaign;
                    return document.campaign?.renderSheet?.({ tab, type });
                }
                document.sheet.render(true, { tab } as AppV1RenderOptions);
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

type SocketMessage = TransferCallbackMessage | RefreshControlsMessage | ShowSheetMessage | { request?: never };
type PF2eSocketEventParams = [message: SocketMessage, userId: string];

export { activateSocketListener, type SocketMessage };
