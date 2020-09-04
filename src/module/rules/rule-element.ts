import {CharacterData, NpcData} from "../actor/actorDataDefinitions";
import {PF2DamageDice, PF2Modifier} from "../modifiers";
import {ItemData} from "../item/dataDefinitions";

export abstract class PF2RuleElement {

    onCreate(actorData: CharacterData|NpcData, item: ItemData, updates: any) {}

    onDelete(actorData: CharacterData|NpcData, item: ItemData, updates: any) {}

    onBeforePrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {}

    onAfterPrepareData(
        actorData: CharacterData | NpcData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        damageDice: Record<string, PF2DamageDice[]>
    ) {}
}
