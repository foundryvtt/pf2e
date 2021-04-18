import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';

interface ItemLookupData {
    pack: string | null;
    id: string;
}

export class ActiveEffectPF2e extends ActiveEffect<ActorPF2e | ItemPF2e> {
    get isEnabled(): boolean {
        return !this.data.disabled;
    }

    get applyOnCast(): boolean {
        return this.getFlag('pf2e', 'applyOnCast') ?? false;
    }

    async enable(): Promise<void> {
        this.update({ disabled: false });
    }

    prepareData(): void {
        for (const change of this.data.changes) {
            // Prepare custom change modes
            if (change.mode === CONST.ACTIVE_EFFECT_MODES.CUSTOM) {
                switch (change.key) {
                    case 'grant': {
                        const lookupData = this.valueIsLookupData(change.value) ? change.value : null;
                        if (this.parent instanceof ActorPF2e && lookupData !== null) {
                            this.isEnabled
                                ? this.grantItem(this.parent, lookupData)
                                : this.revokeItem(this.parent, lookupData);
                        }
                        break;
                    }
                }
            }
        }
    }

    private valueIsLookupData(value: unknown): value is ItemLookupData {
        return value instanceof Object && 'pack' in value && 'id' in value;
    }

    private async grantItem(owner: ActorPF2e, lookupData: ItemLookupData): Promise<void> {
        const toGrant =
            lookupData.pack === null
                ? game.items.get(lookupData.id)
                : await game.packs.get(lookupData.pack)?.getEntity(lookupData.id);

        const ownerAlreadyHas = (item: ItemPF2e) =>
            owner.items.entries.some((ownedItem) => ownedItem.sourceId === item.sourceId);

        if (toGrant instanceof ItemPF2e && !ownerAlreadyHas(toGrant)) {
            toGrant.data.flags.pf2e = { grantedBy: this.data.origin };
            await owner.createEmbeddedEntity('OwnedItem', toGrant.data);
        }
    }

    private async revokeItem(owner: ActorPF2e, lookupData: ItemLookupData): Promise<void> {
        const toRevoke = owner.items.find(
            (item) => !!(item.getFlag('pf2e', 'grantedBy') === this.id && item.sourceId?.endsWith(lookupData.id)),
        );
        await toRevoke?.delete();
    }
}

export interface ActiveEffectPF2e {
    getFlag(scope: string, key: string): unknown;
    getFlag(scope: 'core', key: 'overlay'): string | undefined;
    getFlag(scope: 'core', key: 'statusId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'applyOnCast'): boolean | undefined;
}
