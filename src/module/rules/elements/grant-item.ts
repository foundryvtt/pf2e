import { ActorPF2e } from '@actor';
import { ItemPF2e } from '@item';
import { ItemSourcePF2e } from '@item/data';
import { ErrorPF2e } from '@module/utils';
import { RuleElementPF2e } from '../rule-element';
import { RuleElements } from '../rules';
import { RuleElementData } from '../rules-data-definitions';

export class GrantItemRuleElement extends RuleElementPF2e {
    static async processGrants(
        data: PreCreate<ItemSourcePF2e>[],
        { parent }: { parent?: ActorPF2e },
    ): Promise<ItemSourcePF2e[]> {
        if (!parent) return [];

        const itemGranters = data.filter(
            (datum) => !!datum?.data?.rules?.some((rule) => rule?.key === 'PF2E.RuleElement.GrantItem'),
        );
        return (
            await Promise.all(
                itemGranters.map((granterSource): Promise<ItemSourcePF2e[]> => {
                    granterSource._id = randomID();
                    const granter = new ItemPF2e(granterSource, { parent });
                    const grantRules = RuleElements.fromOwnedItem(granter as Embedded<ItemPF2e>).filter(
                        (rule): rule is GrantItemRuleElement => rule instanceof GrantItemRuleElement,
                    );
                    return Promise.all(grantRules.map((rule) => rule.preCreate()));
                }),
            )
        ).flat();
    }

    static processRevokes(
        ids: string[],
        { parent, force = false }: { parent?: ActorPF2e; force?: boolean },
    ): { add: string[]; remove: string[] } {
        if (!parent) return { add: [], remove: [] };

        const toDelete = ids.flatMap((itemId) => parent.items.get(itemId) ?? []);
        const blocked = toDelete.flatMap((item) => (item.grantedBy?.preDelete === 'block' && !force ? item : []));
        const itemGranters = toDelete.filter((item) => !blocked.includes(item) && item.grantedItems.length > 0);
        const additional = itemGranters
            .flatMap((item) => item.grantedItems.filter((grant) => grant.preDelete === 'cascade'))
            .map((grant) => grant.item);
        return { add: additional.map((item) => item.id), remove: blocked.map((item) => item.id) };
    }

    async preCreate(): Promise<ItemSourcePF2e> {
        const grantedItem = await fromUuid(this.data.uuid);
        if (!(grantedItem instanceof ItemPF2e)) throw ErrorPF2e(`Item (UUID: ${this.data.uuid}) not found`);

        const grantedSource = grantedItem.toObject();
        grantedSource._id = randomID();
        mergeObject(grantedSource, {
            'flags.pf2e.grantedBy': { grantedBy: this.item.id, preDelete: deepClone(this.data.preDelete?.grantee) },
        });

        const grants = this.item.data.flags.pf2e.itemGrants ?? [];
        mergeObject(this.item.data._source, {
            'flags.pf2e.itemGrants': [
                ...grants,
                { itemId: grantedSource._id, preDelete: deepClone(this.data.preDelete?.granter) ?? null },
            ],
        });

        return grantedSource;
    }
}

export interface GrantItemRuleElement extends RuleElementPF2e {
    data: RuleElementData & {
        uuid: string;
        preDelete?: {
            granter?: 'block' | 'cascade';
            grantee?: 'block' | 'cascade';
        };
    };
}
