import { ItemTransfer, ItemTransferData } from "@actor/item-transfer.ts";
import { ErrorPF2e } from "@util";

interface TransferCallbackMessage {
    request: "itemTransfer";
    data: ItemTransferData;
}

interface RefreshControlsMessage {
    request: "refreshSceneControls";
    data: { layer?: string };
}

export type SocketEventCallback = [
    message: TransferCallbackMessage | RefreshControlsMessage | { request?: never },
    userId: string
];

export function activateSocketListener(): void {
    game.socket.on("system.pf2e", async (...[message, userId]: SocketEventCallback) => {
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
            default:
                throw ErrorPF2e(`Received unrecognized socket emission: ${message.request}`);
        }
    });
}
