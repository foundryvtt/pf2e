import { ItemDataPF2e } from '@item/data';
import { CharacterData, FamiliarData, NPCData } from '@actor/data';
import { RuleElementPF2e } from '../rule-element';
import { RuleElementSource, RuleElementData } from '../rules-data-definitions';
import { ItemPF2e } from '@item';

/**
 * @category RuleElement
 */
export class PF2SetPropertyRuleElement extends RuleElementPF2e {
    /** Apply this rule element before all others */
    constructor(data: RuleElementSource, item: Embedded<ItemPF2e>) {
        super(data, item);
        this.data.priority = 9;
    }

    override onCreate(actorData: CharacterData | NPCData | FamiliarData, _item: ItemDataPF2e, actorUpdates: any) {
        if (this.data.property && typeof this.data.on?.added !== 'undefined' && this.data.on?.added !== null) {
            actorUpdates[this.data.property] = this.data.on.added;
            if (this.data.retain) {
                actorUpdates[`flags.${game.system.id}.set-property.${this.getSafePropertyName()}`] = getProperty(
                    actorData,
                    this.data.property,
                );
            }
        }
    }

    override onDelete(actorData: CharacterData | NPCData | FamiliarData, _item: ItemDataPF2e, actorUpdates: any) {
        if (this.data.property && typeof this.data.on?.removed !== 'undefined' && this.data.on?.removed !== null) {
            actorUpdates[this.data.property] = this.data.on.removed;
        } else if (this.data.property && this.data.retain) {
            actorUpdates[this.data.property] = getProperty(
                actorData,
                `flags.${game.system.id}.set-property.${this.getSafePropertyName()}`,
            );
            actorUpdates[`flags.${game.system.id}.set-property.-=${this.getSafePropertyName()}`] = null;
        }
    }

    private getSafePropertyName(): string {
        return this.data.property?.replace(/\./g, '-').slugify() ?? '';
    }
}

export interface PF2SetPropertyRuleElement {
    data: RuleElementData & {
        property?: string;
        on?: {
            added?: string | null;
            removed?: string | null;
        };
        retain?: boolean;
    };
}
