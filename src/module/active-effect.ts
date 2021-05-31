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
        await this.update({ disabled: false });
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
        }
    }

    /**
     * Parse non-primitive change values just prior to application to the actor
     * @override
     */
    apply(actor: ActorPF2e, change: ApplicableChangeData): unknown {
        if (!change.value.startsWith('{')) return super.apply(actor, change);
        // Prepare changes with non-primitive values
        const effect = change.effect;
        const parsedValue = ((): Record<string, unknown> => {
            try {
                return JSON.parse(change.value);
            } catch {
                const parenthetical = `(item ${effect.data.origin} on actor ${this.uuid})`;
                ui.notifications.error(`Failed to parse ActiveEffect change value ${parenthetical}`);
                effect.data.disabled = true;
                return { name: game.i18n.localize('Error'), type: 'untyped', modifier: 0 };
            }
        })();

        // Assign localized name to the effect from its originating item
        const originItem = actor.items.find((item) => item.uuid === effect.data.origin);
        parsedValue.name = originItem instanceof ItemPF2e ? originItem.name : effect.data.label;

        // Evaluate dynamic changes
        if (typeof parsedValue['modifier'] === 'string' && parsedValue['modifier'].includes('@')) {
            let parsedModifier: number | null = null;
            try {
                parsedModifier = Roll.safeEval(Roll.replaceFormulaData(parsedValue['modifier'], actor.data));
            } catch (_error) {
                ui.notifications.error(`Failed to parse ActiveEffect formula value ${parsedValue.modifier}`);
            }
            if (parsedModifier !== null) {
                parsedValue['modifier'] = parsedModifier;
            } else {
                const parenthetical = `(item ${effect.data.origin} on actor ${this.uuid})`;
                ui.notifications.error(`Failed to parse ActiveEffect change value ${parenthetical}`);
                effect.data.disabled = true;
                parsedValue['modifier'] = 0;
            }
        }
        const isMinimalModifier = (obj: Record<string, unknown>): obj is MinimalModifier => {
            return typeof obj['name'] === 'string' && typeof obj['modifier'] === 'number';
        };
        if (isMinimalModifier(parsedValue)) {
            change.value = new ModifierPF2e(
                parsedValue.name,
                parsedValue.modifier,
                parsedValue.type,
            ) as unknown as string;
        } else {
            change.value = parsedValue as unknown as string;
        }

        return super.apply(actor, change);
    }

    private valueIsLookupData(value: unknown): value is ItemLookupData {
        return value instanceof Object && 'pack' in value && 'id' in value;
    }

    private async grantItem(owner: ActorPF2e, lookupData: ItemLookupData): Promise<void> {
        const toGrant =
            lookupData.pack === null
                ? game.items.get(lookupData.id)
                : await game.packs.get(lookupData.pack)?.getDocument(lookupData.id);

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

    /**
     * Propagate created prototype token overrides to any placed tokens
     * @override
     */
    protected _onCreate(data: foundry.data.ActiveEffectSource, options: DocumentModificationContext, userId: string) {
        super._onCreate(data, options, userId);
        const parent = this.parent;
        if (parent instanceof ActorPF2e) {
            for (const token of parent.getActiveTokens()) {
                token.applyActiveEffects(parent.overrides.token);
            }
        }
    }

    /**
     * Propagate deleted prototype token overrides to any placed tokens
     * @override
     */
    protected _onDelete(options: DocumentModificationContext, userId: string) {
        super._onDelete(options, userId);
        const parent = this.parent;
        if (parent instanceof ActorPF2e) {
            for (const token of parent.getActiveTokens()) {
                token.applyActiveEffects(parent.overrides.token);
            }
        }
    }
}

export interface ActiveEffectPF2e {
    readonly parent: ActorPF2e | ItemPF2e;

    getFlag(scope: string, key: string): unknown;
    getFlag(scope: 'core', key: 'overlay'): string | undefined;
    getFlag(scope: 'core', key: 'statusId'): string | undefined;
    getFlag(scope: 'pf2e', key: 'applyOnCast'): boolean | undefined;
}
