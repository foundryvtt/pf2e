import { MigrationBase } from './base';
import { ItemData } from '@item/dataDefinitions';

/** Change `delimiter`-delimited string traits into arrays of strings */
export class Migration597MakeTraitTraitsArrays extends MigrationBase {
    static version = 0.597;

    async updateItem(itemData: ItemData) {
        const traits: unknown = itemData.data.traits.value;
        const delimiter = /[;,|]+\s*/;
        const dromedarify = (text: string) => text.slice(0, 1).toLowerCase() + text.slice(1);

        itemData.data.traits.value = ((): string[] => {
            if (Array.isArray(traits)) {
                return traits.flatMap((trait) =>
                    typeof trait === 'string' && trait.trim().length > 0 ? dromedarify(trait.trim()) : [],
                );
            }
            if (typeof traits === 'string') {
                return traits.split(delimiter).flatMap((trait) => (trait.length > 0 ? dromedarify(trait) : []));
            }
            // What is this???
            return traits as string[];
        })();
    }
}
