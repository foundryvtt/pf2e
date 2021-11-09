import { CharacterPF2e } from "@actor";
import { CombatProficiencies, LinkedProficiencyKey } from "@actor/character/data";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { WeaponCategory } from "@item/weapon/data";
import { PredicatePF2e } from "@system/predication";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementSource, RuleElementData } from "../rules-data-definitions";

class LinkedProficiencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: LinkedProficiencySource, item: Embedded<ItemPF2e>) {
        super(data, item);
        if (!this.dataIsValid(data)) this.ignored = true;
    }

    private dataIsValid(data: LinkedProficiencySource): boolean {
        return (
            typeof data.selector === "string" &&
            !!data.predicate &&
            new PredicatePF2e(data.predicate).isValid &&
            typeof data.sameAs === "string" &&
            data.sameAs in CONFIG.PF2E.weaponCategories
        );
    }

    override onBeforePrepareData(): void {
        if (this.ignored) return;

        const attackProficiencies: DeepPartial<CombatProficiencies> = this.actor.data.data.martial;
        const proficiency = attackProficiencies[this.data.sameAs];
        if (!proficiency) {
            const { item } = this;
            console.warn(
                `PF2e System | Linked proficiency rules element on item "${item.name}" (${item.uuid}) `,
                `aborted: category "${this.data.sameAs}" not found`
            );
            this.ignored = true;
            return;
        }
        attackProficiencies[`linked-${this.data.selector}`] = {
            predicate: this.data.predicate,
            sameAs: this.data.sameAs,
        };
    }
}

interface LinkedProficiencyRuleElement extends RuleElementPF2e {
    data: LinkedProficiencyData;

    get actor(): CharacterPF2e;
}

interface LinkedProficiencyData extends RuleElementData {
    key: "LinkedProficiency";
    selector: LinkedProficiencyKey;
    predicate: PredicatePF2e;
    sameAs: WeaponCategory;
}

export interface LinkedProficiencySource extends RuleElementSource {
    sameAs?: unknown;
}

export { LinkedProficiencyRuleElement };
