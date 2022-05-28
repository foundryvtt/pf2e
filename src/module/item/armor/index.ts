import { PhysicalItemHitPoints } from "@item/physical/data";
import { MAGIC_TRADITIONS } from "@item/spell/values";
import { LocalizePF2e } from "@module/system/localize";
import { addSign, ErrorPF2e, setHasElement } from "@util";
import { PhysicalItemPF2e } from "../physical";
import { getResiliencyBonus } from "../runes";
import { ArmorCategory, ArmorData, ArmorGroup, BaseArmorType } from "./data";

class ArmorPF2e extends PhysicalItemPF2e {
    override isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    get isShield(): boolean {
        return this.data.data.category === "shield";
    }

    get isArmor(): boolean {
        return !this.isShield;
    }

    get baseType(): BaseArmorType | null {
        return this.data.data.baseItem ?? null;
    }

    get group(): ArmorGroup | null {
        return this.data.data.group || null;
    }

    get category(): ArmorCategory {
        return this.data.data.category;
    }

    get dexCap(): number | null {
        return this.isShield ? null : this.data.data.dex.value;
    }

    get strength(): number | null {
        return this.isShield ? null : this.data.data.strength.value;
    }

    get checkPenalty(): number | null {
        return this.isShield ? null : this.data.data.check.value;
    }

    get speedPenalty(): number {
        return this.data.data.speed.value;
    }

    get acBonus(): number {
        const potencyRune = this.isArmor && this.isInvested ? this.data.data.runes.potency : 0;
        const baseArmor = Number(this.data.data.armor.value) || 0;
        return this.isShield && this.isBroken ? 0 : baseArmor + potencyRune;
    }

    get hitPoints(): PhysicalItemHitPoints {
        return deepClone(this.data.data.hp);
    }

    get hardness(): number {
        return this.data.data.hardness;
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
        if (!(this.isShield && (this.actor?.data.type === "character" || this.actor?.data.type === "npc"))) {
            return false;
        }

        return this.actor.heldShield === this && this.actor.data.data.attributes.shield.raised;
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "armor"): string[] {
        return super.getRollOptions(prefix).concat(
            Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group}`]: !!this.group,
                [`base:${this.baseType}`]: !!this.baseType,
            })
                .filter(([_key, isTrue]) => isTrue)
                .map(([key]) => {
                    const delimitedPrefix = prefix ? `${prefix}:` : "";
                    return `${delimitedPrefix}${key}`;
                })
        );
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Add traits from potency rune
        const baseTraits = this.data.data.traits.value;
        const fromRunes: ("invested" | "abjuration")[] =
            this.data.data.potencyRune.value || this.data.data.resiliencyRune.value ? ["invested", "abjuration"] : [];
        const hasTraditionTraits = baseTraits.some((t) => setHasElement(MAGIC_TRADITIONS, t));
        const magicTraits: "magical"[] = fromRunes.length > 0 && !hasTraditionTraits ? ["magical"] : [];
        this.data.data.traits.value = Array.from(new Set([...baseTraits, ...fromRunes, ...magicTraits]));
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.data.data;
        const { potencyRune, resiliencyRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = systemData;
        this.data.data.runes = {
            potency: potencyRune.value ?? 0,
            resilient: getResiliencyBonus({ resiliencyRune }),
            property: [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value].filter(
                (rune): rune is string => !!rune
            ),
        };
    }

    override prepareActorData(): void {
        const { actor } = this;
        if (!actor) throw ErrorPF2e("This method may only be called from embedded items");

        const ownerIsPCOrNPC = actor.data.type === "character" || actor.data.type === "npc";
        const shieldIsAssigned = ownerIsPCOrNPC && actor.data.data.attributes.shield.itemId !== null;

        if (this.isArmor && this.isEquipped) {
            // Set roll options for certain armor traits
            const traits = this.traits;
            for (const [trait, domain] of [
                ["bulwark", "reflex"],
                ["flexible", "skill-check"],
                ["noisy", "skill-check"],
            ] as const) {
                if (traits.has(trait)) {
                    const checkOptions = (actor.rollOptions[domain] ??= {});
                    checkOptions[`self:armor:trait:${trait}`] = true;
                }
            }
        } else if (ownerIsPCOrNPC && !shieldIsAssigned && this.isEquipped && actor.heldShield === this) {
            // Set actor-shield data from this shield item
            const { hitPoints } = this;
            actor.data.data.attributes.shield = {
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
        }
    }

    override getChatData(this: Embedded<ArmorPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const translations = LocalizePF2e.translations.PF2E;
        const properties = [
            this.isArmor ? CONFIG.PF2E.armorTypes[this.category] : CONFIG.PF2E.weaponCategories.martial,
            `${addSign(this.acBonus)} ${translations.ArmorArmorLabel}`,
            this.isArmor ? `${data.dex.value || 0} ${translations.ArmorDexLabel}` : null,
            this.isArmor ? `${data.check.value || 0} ${translations.ArmorCheckLabel}` : null,
            this.speedPenalty ? `${data.speed.value || 0} ${translations.ArmorSpeedLabel}` : null,
        ];

        return this.processChatData(htmlOptions, {
            ...super.getChatData(),
            traits: this.traitChatData(CONFIG.PF2E.armorTraits),
            properties,
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E;
        const base = this.baseType ? translations.Item.Armor.Base[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.armorGroups[this.group] : null;
        const fallback = this.isShield ? "PF2E.ArmorTypeShield" : "ITEM.TypeArmor";

        const itemType = game.i18n.localize(base ?? group ?? fallback);

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

interface ArmorPF2e {
    readonly data: ArmorData;
}

export { ArmorPF2e };
