import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { MinimalModifier, ModifierPF2e } from './modifiers';

interface ItemLookupData {
    pack: string | null;
    id: string;
}

export class ActiveEffectPF2e extends ActiveEffect {
    get isEnabled(): boolean {
        return !this.data.disabled;
    }

    get applyOnCast(): boolean {
        return this.getFlag('pf2e', 'applyOnCast') ?? false;
    }

    async enable(): Promise<void> {
        this.update({ disabled: false });
    }

    prepareBaseData(): void {
        super.prepareBaseData();
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

            // Prepare changes with non-primitive values
            if (typeof change.value === 'string' && change.value.startsWith('{')) {
                type UnprocessedModifier = Omit<MinimalModifier, 'modifier'> & { modifier: string | number };
                const parsedValue = ((): UnprocessedModifier => {
                    try {
                        return JSON.parse(change.value);
                    } catch {
                        const parenthetical = `(item ${this.data.origin} on actor ${this.uuid})`;
                        ui.notifications.error(`Failed to parse ActiveEffect change value ${parenthetical}`);
                        this.data.disabled = true;
                        return { name: game.i18n.localize('Error'), type: 'untyped', modifier: 0 };
                    }
                })();
                // Assign localized name to the effect from its originating item
                if (!(this.parent instanceof ActorPF2e)) return;

                const items: Collection<ItemPF2e> = this.parent.items;
                const originItem = items.find((item) => item.uuid === this.data.origin);
                parsedValue.name = originItem instanceof ItemPF2e ? originItem.name : this.data.label;

                // Evaluate dynamic changes
                if (typeof parsedValue.modifier === 'string' && parsedValue.modifier.includes('@')) {
                    let parsedModifier: number | null = null;
                    try {
                        parsedModifier = Roll.safeEval(Roll.replaceFormulaData(parsedValue.modifier, this.parent.data));
                    } catch (_error) {
                        ui.notifications.error(`Failed to parse ActiveEffect formula value ${parsedValue.modifier}`);
                    }
                    if (parsedModifier !== null) {
                        parsedValue.modifier = parsedModifier;
                    } else {
                        const parenthetical = `(item ${this.data.origin} on actor ${this.uuid})`;
                        ui.notifications.error(`Failed to parse ActiveEffect change value ${parenthetical}`);
                        this.data.disabled = true;
                        parsedValue.modifier = 0;
                    }
                }
                if (typeof parsedValue.modifier === 'number') {
                    change.value = (new ModifierPF2e(
                        parsedValue.name,
                        parsedValue.modifier,
                        parsedValue.type,
                    ) as unknown) as string; // 🤫 Don't tell Atro!
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
            owner.items.some((ownedItem) => ownedItem.sourceId === item.sourceId);

        if (toGrant instanceof ItemPF2e && !ownerAlreadyHas(toGrant)) {
            toGrant.data.flags.pf2e = { grantedBy: this.data.origin };
            await owner.createEmbeddedDocuments('Item', [toGrant.data]);
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
    readonly data: foundry.data.ActiveEffectData<ActiveEffectPF2e>;

    getFlag(scope: string, key: string): unknown;
    getFlag(scope: 'core', key: 'overlay'): string | undefined;
    getFlag(scope: 'core', key: 'statusId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'applyOnCast'): boolean | undefined;
}
