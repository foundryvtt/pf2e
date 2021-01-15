/* global game */
import { PF2EActor } from './actor';
import { LootData } from './actorDataDefinitions';
import { PF2EPhysicalItem } from '../item/physical';
import { PF2EItem } from '../item/item';
import { attemptToRemoveCoinsByValue, extractPriceFromItem } from '../item/treasure';

export class PF2ELoot extends PF2EActor {
    /** @override */
    data!: LootData;

    /** @override
     * Anyone can update a loot actor
     */
    static can(user: User, action: string, target: PF2EActor): boolean {
        if (action === 'update') {
            return target.hasPerm(user, 'OBSERVER');
        }
        return super.can(user, action, target);
    }

    async transferItemToActor(
        targetActor: PF2EActor,
        item: PF2EItem,
        quantity: number,
        containerId: string,
    ): Promise<PF2EItem> {
        // If we don't have permissions send directly to super to prevent removing the coins twice or reject as needed
        if (!(this.hasPerm(game.user, 'owner') && targetActor.hasPerm(game.user, 'owner'))) {
            return super.transferItemToActor(targetActor, item, quantity, containerId);
        }
        if (this.data.data.lootSheetType === 'Merchant' && !this.getFlag('pf2e', 'editLoot.value')) {
            let itemValue = extractPriceFromItem(item.data, quantity);
            if (await attemptToRemoveCoinsByValue({ actor: targetActor, coinsToRemove: itemValue })) {
                let chatData =
                    `${item.name}` + game.i18n.localize('PF2E.loot.PurchasedItem') + `${targetActor.data.name}`;
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    content: chatData,
                });
                return super.transferItemToActor(targetActor, item, quantity, containerId);
            } else {
                let chatData = game.i18n.localize('PF2E.loot.InsufficientCurrencyError') + `${targetActor.data.name}`;
                ChatMessage.create({
                    user: game.user.id,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    content: chatData,
                });
                return null;
            }
        }
        return super.transferItemToActor(targetActor, item, quantity, containerId);
    }
}

export interface LootTransferData {
    source: {
        tokenId?: string;
        actorId: string;
        itemId: string;
    };
    target: {
        tokenId?: string;
        actorId: string;
    };
    quantity: number;
    containerId: string;
}

export class LootTransfer implements LootTransferData {
    constructor(
        public source: LootTransferData['source'],
        public target: LootTransferData['target'],
        public quantity: number,
        public containerId: string,
    ) {}

    request(): void {
        const gamemaster = Array.from(game.users.values()).find((user) => user.isGM && user.active);
        if (gamemaster === undefined) {
            ui.notifications.error('A GM must be online in order to loot or deposit an item.');
            return null;
        }
        console.debug(`PF2e System | Requesting loot transfer from GM ${gamemaster.name}`);

        game.socket.emit('system.pf2e', { request: 'lootTransfer', data: this });
    }

    // Only a GM can call this method, or else Foundry will block it
    enact(requester: User): void {
        if (!game.user.isGM) {
            return;
        }

        console.debug('PF2e System | Enacting loot transfer');
        const getActor = (tokenId: string, actorId: string): PF2EActor | undefined => {
            if (typeof tokenId === 'string') {
                const thisToken = canvas.tokens.placeables.find((token) => token.id === tokenId);
                return thisToken.actor;
            }
            return game.actors.find((actor) => actor.id === actorId);
        };
        const sourceActor = getActor(this.source.tokenId, this.source.actorId);
        const sourceItem = sourceActor.items.find((item) => item.id === this.source.itemId);
        const targetActor = getActor(this.target.tokenId, this.target.actorId);

        // Sanity checks
        if (
            sourceActor instanceof PF2EActor &&
            sourceItem instanceof PF2EPhysicalItem &&
            targetActor instanceof PF2EActor &&
            (sourceActor.hasPerm(requester, 'owner') || sourceActor instanceof PF2ELoot) &&
            (targetActor.hasPerm(requester, 'owner') || targetActor instanceof PF2ELoot)
        ) {
            sourceActor.transferItemToActor(targetActor, sourceItem, this.quantity, this.containerId);
        } else {
            console.error('PF2e System | Failed sanity check!');
        }
    }
}
