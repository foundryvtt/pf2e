import { PartyPF2e } from "@actor";
import { ItemTransfer, ItemTransferData } from "@actor/item-transfer.ts";
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
