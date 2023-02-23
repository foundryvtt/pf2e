import {AutomaticBonusProgression as ABP} from "@actor/character/automatic-bonus-progression";
import {ItemSummaryData} from "@item/data";
import {
    ARMOR_MATERIAL_VALUATION_DATA,
    ARMOR_PROPERTY_RUNES,
    ARMOR_VALUATION_DATA,
    ArmorPropertyRuneData,
    Bulk,
    CoinsPF2e,
    getPropertySlots,
    MaterialGradeData,
    PhysicalItemHitPoints,
    PhysicalItemPF2e,
    RuneValuationData,
} from "@item/physical";
import {MAGIC_TRADITIONS} from "@item/spell/values";
import {LocalizePF2e} from "@module/system/localize";
import {addSign, ErrorPF2e, setHasElement, sluggify} from "@util";
import {ArmorCategory, ArmorData, ArmorGroup, ArmorPropertyRuneType, BaseArmorType, ResilientRuneType} from ".";
import {ArmorMaterialData} from "@item/armor";
import {OneToThree} from "@module/data";

class ArmorPF2e extends PhysicalItemPF2e {
    override isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    override get material(): ArmorMaterialData {
        return this.system.material;
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

    get isSpecific(): boolean {
        return this.system.specific?.value ?? false;
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
        if (this.initialized) ABP.cleanupRunes(this);

        this.prepareMaterialAndRunes();
        this.prepareLevelAndRarity();
        // Set the name according to the precious material and runes
        this.name = this.generateMagicName();
    }

    private prepareMaterialAndRunes(): void {
        const preciousMaterial =
            this.system.preciousMaterial.value && this.system.preciousMaterialGrade.value
                ? { type: this.system.preciousMaterial.value, grade: this.system.preciousMaterialGrade.value }
                : null;
        this.system.material = { precious: preciousMaterial };

        const { potencyRune, resiliencyRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = this.system;

        const resilientRuneBonus: Map<ResilientRuneType | null, OneToThree> = new Map([
            ["resilient", 1],
            ["greaterResilient", 2],
            ["majorResilient", 3],
        ]);

        // Derived rune data structure
        const runes = (this.system.runes = {
            potency: potencyRune.value ?? 0,
            resilient: resilientRuneBonus.get(resiliencyRune.value) ?? 0,
            property: [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value].filter(
                (r): r is ArmorPropertyRuneType => !!r && r in ARMOR_PROPERTY_RUNES
            ),
        });

        if (this.isShoddy && this._source.system.check.value) {
            this.system.check.value = this._source.system.check.value - 2;
        }

        // Limit property rune slots
        const propertyRuneSlots =
            ABP.isEnabled(this.actor) && this.actor?.isOfType("character")
                ? ABP.getArmorPotency(this.actor.level)
                : getPropertySlots(this);
        runes.property.length = Math.min(runes.property.length, propertyRuneSlots);
    }

    /** Set level, price, and rarity according to precious material and runes */
    private prepareLevelAndRarity(): void {
        const systemData = this.system;

        // Collect all traits from the runes and apply them to the armor
        const runesData = this.getRunesValuationData();
        const baseTraits = systemData.traits.value;
        const { runes } = this.system;
        const hasRunes = runes.potency > 0 || runes.resilient > 0 || runes.property.length > 0;
        const magicTraits: ("abjuration" | "invested" | "magical")[] = baseTraits.some((t) =>
            setHasElement(MAGIC_TRADITIONS, t)
        )
            ? ["abjuration", "invested"]
            : hasRunes
            ? ["abjuration", "invested", "magical"]
            : [];
        systemData.traits.value = Array.from(new Set([...baseTraits, ...magicTraits]));

        // Stop here if this armor is not a magical or precious-material item, or if it is a specific magic armor
        const materialData = this.getMaterialValuationData();
        if (!(this.isMagical || materialData) || this.isSpecific) return;

        const baseLevel = this.level;
        systemData.level.value = runesData
            .map((runeData) => runeData.level)
            .concat(materialData?.level ?? 0)
            .reduce((highest, level) => (level > highest ? level : highest), baseLevel);

        const rarityOrder = {
            common: 0,
            uncommon: 1,
            rare: 2,
            unique: 3,
        };
        const baseRarity = this.rarity;
        systemData.traits.rarity = runesData
            .map((runeData) => runeData.rarity)
            .concat(materialData?.rarity ?? "common")
            .reduce((highest, rarity) => (rarityOrder[rarity] > rarityOrder[highest] ? rarity : highest), baseRarity);
    }

    private getRunesValuationData(): RuneValuationData[] {
        const propertyRuneData: Record<string, ArmorPropertyRuneData | undefined> = CONFIG.PF2E.runes.armor.property;
        return [
            ARMOR_VALUATION_DATA.potency[this.system.runes.potency],
            ARMOR_VALUATION_DATA.resilient[this.system.runes.resilient],
            ...this.system.runes.property.map((p) => propertyRuneData[p]),
        ].filter((datum): datum is RuneValuationData => !!datum);
    }

    private getMaterialValuationData(): MaterialGradeData | null {
        const material = this.material;
        const materialData = ARMOR_MATERIAL_VALUATION_DATA[material.precious?.type ?? ""];
        return materialData?.[material.precious?.grade ?? "low"] ?? null;
    }

    generateMagicName(): string {
        const translations = LocalizePF2e.translations.PF2E;
        const baseArmors = translations.Item.Armor.Base;

        if (this.isSpecific || !this.baseType) {
            return this.name;
        }

        const { material } = this;
        const { runes } = this.system;
        const potencyRune = runes.potency;
        const resilientRune = ((): keyof ConfigPF2e["PF2E"]["armorResiliencyRunes"] | null => {
            const locMap = { 0: null, 1: "resilient", 2: "greaterResilient", 3: "majorResilient" } as const;
            return locMap[runes.resilient];
        })();

        const params = {
            base: this.baseType ? baseArmors[this.baseType] : this.name,
            material: material.precious && game.i18n.localize(CONFIG.PF2E.preciousMaterials[material.precious.type]),
            potency: potencyRune,
            resilient: resilientRune && game.i18n.localize(CONFIG.PF2E.armorResiliencyRunes[resilientRune]),
            property1: runes.property[0] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[runes.property[0]]),
            property2: runes.property[1] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[runes.property[1]]),
            property3: runes.property[2] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[runes.property[2]]),
            property4: runes.property[3] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[runes.property[3]]),
        };
        const formatStrings = translations.Item.Armor.GeneratedName;
        // Construct a localization key from the weapon material and runes
        const formatString = (() => {
            const potency = params.potency && "Potency";
            const resilient = params.resilient && "Resilient";
            const properties = params.property4
                ? "FourProperties"
                : params.property3
                ? "ThreeProperties"
                : params.property2
                ? "TwoProperties"
                : params.property1
                ? "OneProperty"
                : null;
            const material = params.material && "Material";
            const key = ([potency, resilient, properties, material]
                .filter((keyPart): keyPart is string => !!keyPart)
                .join("") || null) as keyof typeof formatStrings | null;
            return key && formatStrings[key];
        })();

        return formatString ? game.i18n.format(formatString, params) : this.name;
    }

    override computeAdjustedPrice(): CoinsPF2e | null {
        const materialData = this.getMaterialValuationData();
        if (!(this.isMagical || materialData) || this.isSpecific) return null;

        // Adjust the weapon price according to precious material and runes
        // Base Prices are not included in these cases
        // https://2e.aonprd.com/Rules.aspx?ID=731
        // https://2e.aonprd.com/Equipment.aspx?ID=380
        const runesData = this.getRunesValuationData();
        const materialPrice = materialData?.price ?? 0;
        const heldOrStowedBulk = new Bulk({ light: this.system.bulk.heldOrStowed });
        const bulk = Math.max(Math.ceil(heldOrStowedBulk.normal), 1);
        const materialValue = materialPrice + (bulk * materialPrice) / 10;
        const runeValue = runesData.reduce((sum, rune) => sum + rune.price, 0);
        return new CoinsPF2e({ gp: runeValue + materialValue });
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

interface ArmorPF2e extends PhysicalItemPF2e {
    readonly data: ArmorData;
}

export { ArmorPF2e };
