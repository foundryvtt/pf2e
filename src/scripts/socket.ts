import { ItemTransfer, ItemTransferData } from "@actor/item-transfer";

export type SocketEventCallback = [
    message: {
        request: string;
        data: { [key: string]: any };
    },
    userId: string
];

export function activateSocketListener() {
    game.socket.on("system.pf2e", async (...[message, userId]: SocketEventCallback) => {
        const sender = game.users.get(userId, { strict: true });
        switch (message.request) {
            case "itemTransfer":
                if (game.user.isGM) {
                    console.debug(`PF2e System | Received item-transfer request from ${sender.name}`);
                    const data = message.data as ItemTransferData;
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
                throw Error(`PF2e System | Received unrecognized socket emission: ${message.request}`);
        }
    });
}
