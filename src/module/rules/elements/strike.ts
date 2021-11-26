import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e, WeaponPF2e } from "@item";
import {
    BaseWeaponType,
    WeaponCategory,
    WeaponDamage,
    WeaponGroup,
    WeaponRange,
    WeaponSource,
    WeaponTrait,
} from "@item/weapon/data";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSource, RuleElementSynthetics } from "../rules-data-definitions";

/**
   Create an ephemeral strike on an actor
   @category RuleElement
 */
class StrikeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    weapon: Embedded<WeaponPF2e>;

    constructor(data: StrikeSource, item: Embedded<ItemPF2e>) {
        data.range = Number(data.range) || null;
        super(data, item);

        this.data.category ??= "unarmed";
        this.data.group ??= "brawling";
        this.data.baseType ??= null;
        this.data.range ??= null;
        this.data.traits ??= [];
        this.data.replaceAll = !!(this.data.replaceAll ?? false);

        this.weapon = this.constructWeapon();
    }

    override onBeforePrepareData(_actorData: unknown, { strikes }: RuleElementSynthetics): void {
        const predicatePassed =
            !this.data.predicate ||
            ((): boolean => {
                const rollOptions = this.actor.getRollOptions(["all", "attack", "attack-roll"]);
                return this.data.predicate.test(rollOptions);
            })();

        if (predicatePassed) strikes.push(this.weapon);
    }

    /** Exclude other strikes if this rule element specifies that its strike replaces all others */
    override onAfterPrepareData(): void {
        if (this.data.replaceAll && this.actor.data.type === "character") {
            const systemData = this.actor.data.data;
            systemData.actions = systemData.actions.filter((action) => action.weapon === this.weapon);
        }
    }

    private constructWeapon(): Embedded<WeaponPF2e> {
        const source: PreCreate<WeaponSource> = {
            _id: this.item.id,
            name: this.label,
            type: "weapon",
            img: this.data.img ?? this.item.img,
            data: {
                slug: this.data.slug ?? null,
                description: { value: "" },
                category: this.data.category,
                group: this.data.group,
                baseItem: this.data.baseType,
                damage: this.data.damage?.base ?? { damageType: "bludgeoning", dice: 1, die: "d4" },
                range: this.data.range,
                traits: { value: this.data.traits, rarity: { value: "common" }, custom: "" },
                options: { value: this.data.options ?? [] },
                equipped: { value: true },
            },
        };

        return new WeaponPF2e(source, { parent: this.actor, pf2e: { ready: true } }) as Embedded<WeaponPF2e>;
    }
}

interface StrikeRuleElement {
    data: StrikeData;

    get actor(): CharacterPF2e | NPCPF2e;
}

interface StrikeSource extends RuleElementSource {
    slug?: string;
    img?: unknown;
    category?: unknown;
    group?: unknown;
    baseType?: unknown;
    damage?: unknown;
    range?: unknown;
    traits?: unknown;
    replaceAll?: unknown;
    options?: unknown;
}

interface StrikeData extends RuleElementData {
    slug?: string;
    img?: ImagePath;
    category: WeaponCategory;
    group: WeaponGroup;
    baseType: BaseWeaponType | null;
    damage?: { base?: WeaponDamage };
    range: WeaponRange | null;
    traits: WeaponTrait[];
    replaceAll: boolean;
    options?: string[];
}

export { StrikeRuleElement };
