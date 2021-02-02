import { ItemData } from '../../item/dataDefinitions';
import { CharacterData, FamiliarData, NpcData } from '../../actor/actorDataDefinitions';
import { PF2RuleElement } from '../rule-element';

/**
 * @category RuleElement
 */
export class PF2SetPropertyRuleElement extends PF2RuleElement {
    onCreate(actorData: CharacterData | NpcData | FamiliarData, item: ItemData, actorUpdates: any, tokens: any[]) {
        if (
            this.ruleData.property &&
            typeof this.ruleData.on?.added !== 'undefined' &&
            this.ruleData.on?.added !== null
        ) {
            actorUpdates[this.ruleData.property] = this.ruleData.on.added;
            if (this.ruleData.retain) {
                actorUpdates[`flags.${game.system.id}.set-property.${this.getSafePropertyName()}`] = getProperty(
                    actorData,
                    this.ruleData.property,
                );
            }
        }
    }

    onDelete(actorData: CharacterData | NpcData | FamiliarData, item: ItemData, actorUpdates: any, tokens: any[]) {
        if (
            this.ruleData.property &&
            typeof this.ruleData.on?.removed !== 'undefined' &&
            this.ruleData.on?.removed !== null
        ) {
            actorUpdates[this.ruleData.property] = this.ruleData.on.removed;
        } else if (this.ruleData.property && this.ruleData.retain) {
            actorUpdates[this.ruleData.property] = getProperty(
                actorData,
                `flags.${game.system.id}.set-property.${this.getSafePropertyName()}`,
            );
            actorUpdates[`flags.${game.system.id}.set-property.-=${this.getSafePropertyName()}`] = null;
        }
    }

    private getSafePropertyName(): string {
        return this.ruleData.property.replace(/\./g, '-').slugify();
    }
}
