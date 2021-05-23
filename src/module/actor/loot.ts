import { ActorPF2e } from './base';
import { LootData } from './data-definitions';
import { PhysicalItemPF2e } from '@item/physical';
import { ItemPF2e } from '@item/base';
import { addCoins, attemptToRemoveCoinsByValue, extractPriceFromItem } from '@item/treasure';
import { ErrorPF2e } from '@module/utils';

export class LootPF2e extends ActorPF2e {
    get isLoot(): boolean {
        return this.data.data.lootSheetType === 'Loot';
    }

    get isMerchant(): boolean {
        return this.data.data.lootSheetType === 'Merchant';
    }

    /** Anyone with Limited permission can update a loot actor
     * @override
     */
    static canUserModify(user: User, action: UserAction, target: LootPF2e): boolean {
        if (action === 'update') {
            return target.permission >= CONST.ENTITY_PERMISSIONS.LIMITED;
        }
        return super.canUserModify(user, action, target);
    }

    /**
     * A user can see a loot actor in the actor directory only if they have at least Observer permission
     * @override
     */
    get visible(): boolean {
        return this.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER;
    }

    /** @override */
    async transferItemToActor(
        targetActor: ActorPF2e,
        item: Owned<ItemPF2e>,
        quantity: number,
        containerId?: string,
    ): Promise<Owned<PhysicalItemPF2e> | null> {
        // If we don't have permissions send directly to super to prevent removing the coins twice or reject as needed
        if (!(this.isOwner && targetActor.isOwner)) {
            return super.transferItemToActor(targetActor, item, quantity, containerId);
        }
        if (this.isMerchant && item instanceof PhysicalItemPF2e) {
            const itemValue = extractPriceFromItem(item.data, quantity);
            if (await attemptToRemoveCoinsByValue({ actor: targetActor, coinsToRemove: itemValue })) {
                await addCoins(item.actor, { coins: itemValue, combineStacks: true });
                return super.transferItemToActor(targetActor, item, quantity, containerId);
            } else if (this.isLoot) {
                throw ErrorPF2e('Loot transfer failed');
            } else {
                return null;
            }
        }

        return super.transferItemToActor(targetActor, item, quantity, containerId);
    }
}

export interface LootPF2e extends ActorPF2e {
    readonly data: LootData;

    getFlag(scope: string, key: string): unknown;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'editLoot.value'): boolean | undefined;
}
