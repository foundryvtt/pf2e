import type { ActorPF2e } from "@actor";
import { ItemProxyPF2e, type WeaponPF2e } from "@item";
import { ItemSummaryData } from "@item/base/data/index.ts";
import { PhysicalItemPF2e, RUNE_DATA, getMaterialValuationData } from "@item/physical/index.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { WeaponMaterialSource, WeaponSource, WeaponSystemSource, WeaponTraitsSource } from "@item/weapon/data.ts";
import { WeaponTrait } from "@item/weapon/types.ts";
import { UserPF2e } from "@module/user/document.ts";
import { DamageType } from "@system/damage/types.ts";
import { ErrorPF2e, objectHasKey, setHasElement, signedInteger } from "@util";
import * as R from "remeda";
import { IntegratedWeaponData, ShieldSource, ShieldSystemData } from "./data.ts";
import { BaseShieldType, ShieldTrait } from "./types.ts";

class ShieldPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    override isStackableWith(item: PhysicalItemPF2e<TParent>): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    get baseType(): BaseShieldType | null {
        return this.system.baseItem ?? null;
    }

    get isBuckler(): boolean {
        return ["buckler", "casters-targe", "dart-shield", "gauntlet-buckler", "heavy-rondache", "klar"].includes(
            this.system.baseItem ?? "",
        );
    }

    get isTowerShield(): boolean {
        return ["fortress-shield", "tower-shield"].includes(this.system.baseItem ?? "");
    }

    get speedPenalty(): number {
        return this.system.speedPenalty || 0;
    }

    get acBonus(): number {
        return this.system.acBonus;
    }

    override get isSpecific(): boolean {
        return !!this.system.specific;
    }

    /** Given this is a shield, is it raised? */
    get isRaised(): boolean {
        return (
            !!this.actor?.isOfType("character", "npc") &&
            this.id === this.actor.attributes.shield.itemId &&
            this.actor.attributes.shield.raised
        );
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "armor"): string[] {
        const reinforcingRune = this.system.runes.reinforcing;
        const reinforcingSlug = [null, "minor", "lesser", "moderate", "greater", "major", "supreme"][reinforcingRune];
        const reinforcingOptions = {
            [`rune:reinforcing:${reinforcingRune}`]: !!reinforcingRune,
            [`rune:reinforcing:${reinforcingSlug}`]: !!reinforcingRune,
        };

        return [
            super.getRollOptions(prefix),
            Object.entries({
                [`base:${this.baseType}`]: !!this.baseType,
                ...reinforcingOptions,
            })
                .filter(([, isTrue]) => !!isTrue)
                .map(([key]) => `${prefix}:${key}`),
        ]
            .flat()
            .sort();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Temporary measure during migration
        if ("category" in this.system) {
            this.type = "shield";
            this.system.runes = { reinforcing: 0 };
        }

        const reinforcingRuneData = RUNE_DATA.shield.reinforcing;
        const reinforcingRune = this.system.runes.reinforcing;
        const materialData = getMaterialValuationData(this);

        const adjustFromMaterialAndRune = (property: "hardness" | "maxHP", base: number): number => {
            const fromMaterial = materialData?.[property] ?? base;
            const additionalFromRune = reinforcingRune ? reinforcingRuneData[reinforcingRune]?.[property] : null;
            const sumFromRune = fromMaterial + (additionalFromRune?.increase ?? 0);
            return additionalFromRune && sumFromRune > additionalFromRune.max
                ? Math.max(fromMaterial, additionalFromRune.max)
                : sumFromRune;
        };

        this.system.hardness = adjustFromMaterialAndRune("hardness", this.system.hardness);
        this.system.hp.max = adjustFromMaterialAndRune("maxHP", this.system.hp.max);
        this.system.hp.brokenThreshold = Math.floor(this.system.hp.max / 2);

        // Add traits from fundamental runes
        const baseTraits = this.system.traits.value;
        const hasTraditionTraits = baseTraits.some((t) => setHasElement(MAGIC_TRADITIONS, t));
        const hasReinforcing = !!reinforcingRune;
        const magicTrait = hasReinforcing && !hasTraditionTraits ? "magical" : null;
        this.system.traits.value = R.uniq(R.compact([...baseTraits, magicTrait]).sort()).filter(
            (t) => t in CONFIG.PF2E.shieldTraits,
        );

        // Fill out integrated weapon data if applicable
        const integratedTrait = this.system.traits.value.find((t) => t.startsWith("integrated"));
        if (integratedTrait) {
            const isVersatileWeapon = integratedTrait.includes("versatile");
            const traitParts = integratedTrait.split("-");
            const damageTypeMap: Record<string, DamageType | undefined> = {
                b: "bludgeoning",
                p: "piercing",
                s: "slashing",
            };
            const mainDamageType = damageTypeMap[traitParts.at(2) ?? ""] ?? "slashing";
            const versatileDamageType = isVersatileWeapon ? damageTypeMap[traitParts.at(-1) ?? ""] : null;
            if (this.system.traits.integrated && versatileDamageType) {
                this.system.traits.integrated.versatile = mergeObject(
                    { options: [mainDamageType, versatileDamageType], selection: mainDamageType },
                    this.system.traits.integrated.versatile ?? {},
                );
                this.system.traits.integrated.versatile.options;
            } else if (this.system.traits.integrated) {
                this.system.traits.integrated.versatile = null;
            }

            this.system.traits.integrated = mergeObject(
                {
                    damageType: mainDamageType,
                    runes: { potency: 0, striking: 0, property: [] },
                    versatile: null,
                } satisfies IntegratedWeaponData,
                this.system.traits.integrated ?? {},
            );
        } else {
            this.system.traits.integrated = null;
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.system.acBonus = this.isBroken || this.isDestroyed ? 0 : this.acBonus;
    }

    override prepareActorData(this: ShieldPF2e<ActorPF2e>): void {
        const { actor } = this;
        if (!actor) throw ErrorPF2e("This method may only be called from embedded items");
        this.setActorShieldData();
    }

    override onPrepareSynthetics(this: ShieldPF2e<ActorPF2e>): void {
        super.onPrepareSynthetics();
        this.setActorShieldData();
    }

    // Set actor-shield data from this item--if it is a held shield
    private setActorShieldData(): void {
        const { actor } = this;
        const isEquippedShield = this.isEquipped && actor?.heldShield === this;
        if (!isEquippedShield || !actor.isOfType("character", "npc")) {
            return;
        }
        const { attributes } = actor.system;
        if (![this.id, null].includes(attributes.shield.itemId)) {
            return;
        }

        const { hitPoints } = this;
        attributes.shield = {
            itemId: this.id,
            name: this.name,
            ac: this.acBonus,
            hp: hitPoints,
            hardness: this.hardness,
            brokenThreshold: hitPoints.brokenThreshold,
            raised: this.isRaised,
            broken: this.isBroken,
            destroyed: this.isDestroyed,
            icon: this.img,
        };
        actor.rollOptions.all["self:shield:equipped"] = true;
        if (this.isDestroyed) {
            actor.rollOptions.all["self:shield:destroyed"] = true;
        } else if (this.isBroken) {
            actor.rollOptions.all["self:shield:broken"] = true;
        }
    }

    override async getChatData(
        this: ShieldPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<ItemSummaryData> {
        const properties = [
            `${signedInteger(this.acBonus)} ${game.i18n.localize("PF2E.ArmorArmorLabel")}`,
            this.speedPenalty ? `${this.system.speedPenalty} ${game.i18n.localize("PF2E.ArmorSpeedLabel")}` : null,
        ];

        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits: this.traitChatData(CONFIG.PF2E.shieldTraits),
            properties,
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const base = this.baseType ? CONFIG.PF2E.baseShieldTypes[this.baseType] : null;
        const fallback = "TYPES.Item.shield";
        const itemType = game.i18n.localize(base ?? fallback);

        return typeOnly ? itemType : game.i18n.format("PF2E.identification.UnidentifiedItem", { item: itemType });
    }

    /** Generate a shield bash or other weapon(-like) item from this shield */
    generateWeapon(): WeaponPF2e<TParent> | null {
        if (this.isStowed) return null;

        type BaseWeaponData = Pick<WeaponSource, "_id" | "type" | "name" | "img"> & {
            system: Partial<WeaponSystemSource> & { traits: WeaponTraitsSource };
        };
        const shieldThrowTrait = this.system.traits.value.find((t) => t.startsWith("shield-throw-"));
        const baseData: BaseWeaponData = deepClone({
            ...R.pick(this, ["_id", "name", "img"]),
            type: "weapon",
            system: {
                category: "martial",
                group: "shield",
                baseItem: this.baseType,
                equipped: { ...this._source.system.equipped, invested: null },
                hp: R.pick(this.system.hp, ["value", "max"]),
                material: R.omit(this.material, ["effects"]) as WeaponMaterialSource,
                traits: {
                    rarity: this.rarity,
                    value: shieldThrowTrait ? [`thrown-${shieldThrowTrait.slice(-2)}` as WeaponTrait] : [],
                    otherTags: [],
                },
                damage: { dice: 1, die: "d6", damageType: "bludgeoning", modifier: 0, persistent: null },
            },
        });

        if (this.system.traits.integrated) {
            const damageType = this.system.traits.integrated.damageType;
            const versatileTrait = this.system.traits.value.find((t) => t.includes("versatile"));
            const versatileWeaponTrait = versatileTrait?.slice(versatileTrait.indexOf("versatile")) ?? null;
            if (objectHasKey(CONFIG.PF2E.weaponTraits, versatileWeaponTrait)) {
                baseData.system.traits.value.push(versatileWeaponTrait);
                baseData.system.traits.toggles = {
                    versatile: { selection: this.system.traits.integrated.versatile?.selection ?? damageType },
                };
            }

            const integratedWeaponRunes = this.system.traits.integrated?.runes;
            const additionalData: { name?: string; system: Partial<WeaponSystemSource> } = {
                system: {
                    damage: { dice: 1, die: "d6", damageType, modifier: 0, persistent: null },
                    potencyRune: { value: integratedWeaponRunes?.potency || null },
                    strikingRune: {
                        value: RUNE_DATA.weapon.striking[integratedWeaponRunes?.striking ?? 0]?.slug ?? null,
                    },
                    propertyRune1: { value: integratedWeaponRunes?.property[0] ?? null },
                    propertyRune2: { value: integratedWeaponRunes?.property[1] ?? null },
                    propertyRune3: { value: integratedWeaponRunes?.property[2] ?? null },
                    propertyRune4: { value: integratedWeaponRunes?.property[3] ?? null },
                },
            };
            // Allow the weapon to be renamed
            if (integratedWeaponRunes?.potency || integratedWeaponRunes?.striking) {
                additionalData.name = this._source.name;
            }

            return new ItemProxyPF2e(baseData, { parent: this.parent, shield: this }) as WeaponPF2e<TParent>;
        }

        const damageData: { system: Partial<WeaponSystemSource> } = {
            system: { damage: { dice: 1, die: "d6", damageType: "bludgeoning", modifier: 0, persistent: null } },
        };
        return new ItemProxyPF2e(
            mergeObject(baseData, damageData, { inplace: false }) satisfies PreCreate<WeaponSource>,
            { parent: this.parent, shield: this },
        ) as WeaponPF2e<TParent>;
    }

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (changed.system?.acBonus !== undefined) {
            changed.system.acBonus = Math.clamped(Math.trunc(Number(changed.system.acBonus)), 0, 99) || 0;
        }

        if (changed.system?.speedPenalty !== undefined) {
            changed.system.speedPenalty = Math.clamped(Math.trunc(Number(changed.system.speedPenalty)), -99, 0) || 0;
        }

        const hasIntegratedTrait = this._source.system.traits.value.some((t) => t.startsWith("integrated-"));
        const losingIntegratedTrait =
            hasIntegratedTrait &&
            !!changed.system?.traits?.value &&
            Array.isArray(changed.system.traits.value) &&
            !changed.system.traits.value.some((t) => t.startsWith("integrated-"));
        if (losingIntegratedTrait && changed.system?.traits) {
            changed.system.traits.integrated = null;
        }

        return super._preUpdate(changed, options, user);
    }
}

interface ShieldPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ShieldSource;
    system: ShieldSystemData;

    get traits(): Set<ShieldTrait>;
}

export { ShieldPF2e };
