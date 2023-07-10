import type { ActorPF2e } from "@actor";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ItemSummaryData } from "@item/data/index.ts";
import { PhysicalItemHitPoints, PhysicalItemPF2e, getPropertySlots, getResilientBonus } from "@item/physical/index.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { ErrorPF2e, addSign, setHasElement, sluggify } from "@util";
import { ArmorSource, ArmorSystemData } from "./data.ts";
import { ArmorCategory, ArmorGroup, BaseArmorType } from "./types.ts";

class ArmorPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    override isStackableWith(item: PhysicalItemPF2e<TParent>): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    get isShield(): boolean {
        return this.system.category === "shield";
    }

    get isArmor(): boolean {
        return !this.isShield;
    }

    get isBarding(): boolean {
        return ["light-barding", "heavy-barding"].includes(this.category);
    }

    get baseType(): BaseArmorType | null {
        return this.system.baseItem ?? null;
    }

    get group(): ArmorGroup | null {
        return this.system.group || null;
    }

    get category(): ArmorCategory {
        return this.system.category;
    }

    get dexCap(): number | null {
        return this.isShield ? null : this.system.dex.value;
    }

    get strength(): number | null {
        return this.isShield ? null : this.system.strength.value;
    }

    get checkPenalty(): number | null {
        return this.isShield ? null : this.system.check.value || null;
    }

    get speedPenalty(): number {
        return this.system.speed.value;
    }

    get acBonus(): number {
        const potencyRune = this.isArmor && this.isInvested ? this.system.runes.potency : 0;
        const baseArmor = Number(this.system.armor.value) || 0;
        return this.isShield && (this.isBroken || this.isDestroyed) ? 0 : baseArmor + potencyRune;
    }

    get hitPoints(): PhysicalItemHitPoints {
        return deepClone(this.system.hp);
    }

    get hardness(): number {
        return this.system.hardness;
    }

    get isBroken(): boolean {
        const { hitPoints } = this;
        return hitPoints.max > 0 && !this.isDestroyed && hitPoints.value <= hitPoints.brokenThreshold;
    }

    get isDestroyed(): boolean {
        const { hitPoints } = this;
        return hitPoints.max > 0 && hitPoints.value === 0;
    }

    /** Given this is a shield, is it raised? */
    get isRaised(): boolean {
        if (!(this.isShield && this.actor?.isOfType("character", "npc"))) {
            return false;
        }

        return this.id === this.actor.attributes.shield.itemId && this.actor.attributes.shield.raised;
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "armor"): string[] {
        return super.getRollOptions(prefix).concat(
            Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group}`]: !!this.group,
                [`base:${this.baseType}`]: !!this.baseType,
            })
                .filter(([, isTrue]) => isTrue)
                .map(([key]) => `${prefix}:${key}`)
        );
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.potencyRune.value ||= null;
        this.system.resiliencyRune.value ||= null;
        // Strip out fundamental runes if ABP is enabled: requires this item and its actor (if any) to be initialized
        ABP.cleanupRunes(this);

        // Add traits from potency rune
        const baseTraits = this.system.traits.value;
        const fromRunes: ("invested" | "abjuration")[] =
            this.system.potencyRune.value || this.system.resiliencyRune.value ? ["invested", "abjuration"] : [];
        const hasTraditionTraits = baseTraits.some((t) => setHasElement(MAGIC_TRADITIONS, t));
        const magicTraits: "magical"[] = fromRunes.length > 0 && !hasTraditionTraits ? ["magical"] : [];

        const { traits } = this.system;
        traits.value = Array.from(new Set([...baseTraits, ...fromRunes, ...magicTraits]));
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.system;
        const { potencyRune, resiliencyRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = systemData;
        this.system.runes = {
            potency: potencyRune.value ?? 0,
            resilient: getResilientBonus({ resiliencyRune }),
            property: [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value].filter(
                (rune): rune is string => !!rune
            ),
        };

        // Limit property rune slots
        const maxPropertySlots = getPropertySlots(this);
        this.system.runes.property.length = Math.min(this.system.runes.property.length, maxPropertySlots);
    }

    override prepareActorData(this: ArmorPF2e<ActorPF2e>): void {
        const { actor } = this;
        if (!actor) throw ErrorPF2e("This method may only be called from embedded items");

        const ownerIsPCOrNPC = actor.isOfType("character", "npc");
        const shieldIsAssigned = ownerIsPCOrNPC && actor.attributes.shield.itemId !== null;

        if (this.isArmor && this.isEquipped) {
            // Set some roll options for this armor
            actor.rollOptions.all[`armor:id:${this.id}`] = true;
            actor.rollOptions.all[`armor:category:${this.category}`] = true;
            if (this.group) {
                actor.rollOptions.all[`armor:group:${this.group}`] = true;
            }

            if (this.baseType) {
                actor.rollOptions.all[`armor:base:${this.baseType}`] = true;
            }

            if (this.system.runes.potency > 0) {
                actor.rollOptions.all[`armor:rune:potency:${this.system.runes.potency}`] = true;
            }

            if (this.system.runes.resilient > 0) {
                actor.rollOptions.all[`armor:rune:resilient:${this.system.runes.resilient}`] = true;
            }

            for (const rune of this.system.runes.property) {
                const slug = sluggify(rune);
                actor.rollOptions.all[`armor:rune:property:${slug}`] = true;
            }

            // Set roll options for certain armor traits
            const traits = this.traits;
            for (const [trait, domain] of [
                ["bulwark", "reflex"],
                ["flexible", "skill-check"],
                ["noisy", "skill-check"],
            ] as const) {
                if (traits.has(trait)) {
                    const checkOptions = (actor.rollOptions[domain] ??= {});
                    checkOptions[`armor:trait:${trait}`] = true;
                    checkOptions[`self:armor:trait:${trait}`] = true;
                }
            }
        } else if (ownerIsPCOrNPC && !shieldIsAssigned && this.isEquipped && actor.heldShield === this) {
            // Set actor-shield data from this shield item
            const { hitPoints } = this;
            actor.system.attributes.shield = {
                itemId: this.id,
                name: this.name,
                ac: this.acBonus,
                hp: hitPoints,
                hardness: this.hardness,
                brokenThreshold: hitPoints.brokenThreshold,
                raised: false,
                broken: this.isBroken,
                destroyed: this.isDestroyed,
                icon: this.img,
            };
            actor.rollOptions.all["self:shield:equipped"] = true;
            if (this.isBroken) {
                actor.rollOptions.all["self:shield:broken"] = true;
            } else if (this.isDestroyed) {
                actor.rollOptions.all["self:shield:destroyed"] = true;
            }
        }
    }

    override async getChatData(
        this: ArmorPF2e<ActorPF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        const systemData = this.system;
        const properties = [
            this.isArmor ? CONFIG.PF2E.armorCategories[this.category] : CONFIG.PF2E.weaponCategories.martial,
            `${addSign(this.acBonus)} ${game.i18n.localize("PF2E.ArmorArmorLabel")}`,
            this.isArmor ? `${systemData.dex.value || 0} ${game.i18n.localize("PF2E.ArmorDexLabel")}` : null,
            this.isArmor ? `${systemData.check.value || 0} ${game.i18n.localize("PF2E.ArmorCheckLabel")}` : null,
            this.speedPenalty ? `${systemData.speed.value || 0} ${game.i18n.localize("PF2E.ArmorSpeedLabel")}` : null,
        ];

        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits: this.traitChatData(CONFIG.PF2E.armorTraits),
            properties,
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const base = this.baseType ? CONFIG.PF2E.baseArmorTypes[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.armorGroups[this.group] : null;
        const fallback = this.isShield ? "PF2E.ArmorTypeShield" : "TYPES.Item.armor";
        const itemType = game.i18n.localize(base ?? group ?? fallback);

        return typeOnly ? itemType : game.i18n.format("PF2E.identification.UnidentifiedItem", { item: itemType });
    }
}

interface ArmorPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ArmorSource;
    system: ArmorSystemData;
}

export { ArmorPF2e };
