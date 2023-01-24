import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression";
import { ItemSummaryData } from "@item/data";
import { getResilientBonus, PhysicalItemHitPoints, PhysicalItemPF2e } from "@item/physical";
import { MAGIC_TRADITIONS } from "@item/spell/values";
import { LocalizePF2e } from "@module/system/localize";
import { addSign, ErrorPF2e, setHasElement, sluggify } from "@util";
import { ArmorCategory, ArmorData, ArmorGroup, BaseArmorType } from ".";

class ArmorPF2e extends PhysicalItemPF2e {
    override isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    get isShield(): boolean {
        return this.system.category === "shield";
    }

    get isArmor(): boolean {
        return !this.isShield;
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

        return this.actor.heldShield === this && this.actor.attributes.shield.raised;
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

        this.system.potencyRune.value ||= null;
        this.system.resiliencyRune.value ||= null;
        // Strip out fundamental runes if ABP is enabled: requires this item and its actor (if any) to be initialized
        if (this.initialized) ABP.cleanupRunes(this);

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

        // Work around upstream double data-preparation bug
        // https://github.com/foundryvtt/foundryvtt/issues/7987
        if (this.isShoddy && this._source.system.check.value) {
            this.system.check.value = this._source.system.check.value - 2;
        }
    }

    override prepareActorData(): void {
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
        this: Embedded<ArmorPF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        const systemData = this.system;
        const translations = LocalizePF2e.translations.PF2E;
        const properties = [
            this.isArmor ? CONFIG.PF2E.armorTypes[this.category] : CONFIG.PF2E.weaponCategories.martial,
            `${addSign(this.acBonus)} ${translations.ArmorArmorLabel}`,
            this.isArmor ? `${systemData.dex.value || 0} ${translations.ArmorDexLabel}` : null,
            this.isArmor ? `${systemData.check.value || 0} ${translations.ArmorCheckLabel}` : null,
            this.speedPenalty ? `${systemData.speed.value || 0} ${translations.ArmorSpeedLabel}` : null,
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
