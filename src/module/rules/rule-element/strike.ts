import { RuleElementPF2e, RuleElementData, RuleElementSource } from "./";
import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e, WeaponPF2e } from "@item";
import {
    BaseWeaponType,
    WeaponCategory,
    WeaponDamage,
    WeaponGroup,
    WeaponRangeIncrement,
    WeaponSource,
    WeaponTrait,
    WEAPON_CATEGORIES,
    WEAPON_GROUPS,
} from "@item/weapon/data";
import { DamageType } from "@system/damage";
import { RuleElementOptions } from "./base";
import { objectHasKey, setHasElement, sluggify } from "@util";

/**
 * Create an ephemeral strike on an actor
 * @category RuleElement
 */
class StrikeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override slug: string;

    category: WeaponCategory;

    group: WeaponGroup;

    baseType: BaseWeaponType | null;

    constructor(data: StrikeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data.range = Number(data.range) || null;
        super(data, item, options);

        this.category = setHasElement(WEAPON_CATEGORIES, data.category) ? data.category : "unarmed";
        this.group = setHasElement(WEAPON_GROUPS, data.group) ? data.group : "brawling";
        this.baseType = objectHasKey(CONFIG.PF2E.baseWeaponTypes, data.baseType) ? data.baseType : null;
        this.data.range ??= null;
        this.data.traits ??= [];
        this.data.replaceAll = !!(this.data.replaceAll ?? false);
        this.data.replaceBasicUnarmed = !!(this.data.replaceBasicUnarmed ?? false);
        this.slug ??= sluggify(this.label);
    }

    override beforePrepareData(): void {
        const predicatePassed =
            !this.data.predicate ||
            ((): boolean => {
                const rollOptions = this.actor.getRollOptions(["attack", "attack-roll", "strike-attack-roll"]);
                return this.data.predicate.test(rollOptions);
            })();

        if (predicatePassed) this.actor.synthetics.strikes.push(this.constructWeapon());
    }

    /** Exclude other strikes if this rule element specifies that its strike replaces all others */
    override afterPrepareData(): void {
        if (!this.actor.isOfType("character")) return;

        if (this.data.replaceAll) {
            const systemData = this.actor.data.data;
            systemData.actions = systemData.actions.filter(
                (a) => a.item.id === this.item.id && a.item.name === this.label && a.item.group === this.group
            );
        } else if (this.data.replaceBasicUnarmed) {
            const systemData = this.actor.data.data;
            systemData.actions.findSplice((a) => a.item?.slug === "basic-unarmed");
        }
    }

    private constructWeapon(): Embedded<WeaponPF2e> {
        const damage: DeepPartial<WeaponDamage> = this.data.damage?.base ?? {
            damageType: "bludgeoning",
            dice: 1,
            die: "d4",
        };
        damage.damageType = this.resolveInjectedProperties(damage.damageType ?? "bludgeoning") as DamageType;

        const source: PreCreate<WeaponSource> = {
            _id: this.item.id,
            name: this.label,
            type: "weapon",
            img: this.data.img ?? this.item.img,
            data: {
                slug: this.slug,
                description: { value: "" },
                category: this.category,
                group: this.group,
                baseItem: this.baseType,
                damage,
                range: this.data.range,
                traits: { value: this.data.traits, rarity: "common", custom: "" },
                options: { value: this.data.options ?? [] },
                usage: { value: "held-in-one-hand" },
                equipped: {
                    carryType: "held",
                    handsHeld: 1,
                },
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
    img?: unknown;
    category?: unknown;
    group?: unknown;
    baseType?: unknown;
    damage?: unknown;
    range?: unknown;
    traits?: unknown;
    replaceAll?: unknown;
    replaceBasicUnarmed?: unknown;
    options?: unknown;
}

interface StrikeData extends RuleElementData {
    slug?: string;
    img?: ImagePath;
    damage?: { base?: WeaponDamage };
    range: WeaponRangeIncrement | null;
    traits: WeaponTrait[];
    replaceAll: boolean;
    replaceBasicUnarmed: boolean;
    options?: string[];
}

export { StrikeRuleElement };
