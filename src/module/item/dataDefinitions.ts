export interface ItemDescriptionData {
    description: {
        value: string;
        chat: string;
        unidentified: string;
    };
    source: {
        value: string;
    };
    traits: {
        value: string;
    };
    rarity: {
        value: 'common' | 'uncommon' | 'rare' | 'unique';
    };
    usage: {
        value: string;
    };
};

export interface PhysicalItemData {
    quantity: {
        value: number;
    }
    hp: {
        value: number;
    }
    maxHp: {
        value: number;
    };
    hardness: {
        value: number;
    }
    brokenThreshold: {
        value: number;
    }
    weight: {
        value: number
    }
    equippedBulk: {
        value: string
    }
    price: {
        value: number
    }
    invested: {
        value: boolean
    }
    equipped: {
        value: boolean
    }
    identified: {
        value: boolean
    },
    stackGroup: {
        value: string
    },
    bulkCapacity: {
        value: string
    },
    negateBulk: {
        value: string
    },
    containerId: {
        value: string
    },
    preciousMaterial: {
        value: string
    },
    preciousMaterialGrade: {
        value: string
    },
    collapsed: {
        value: boolean
    }
}

export interface ItemLevelData {
    level: {
        value: number
    }
}

export interface ActivatedEffectData {
    activation: {
        type: string,
        cost: number,
        condition: string
    },
    duration: {
        value: any,
        units: string
    },
    target: {
        value: any,
        units: string,
        type: string
    },
    range: {
        value: any,
        long: any,
        units: any
    },
    uses: {
        value: number,
        max: number,
        per: any
    }
}

export interface MagicItemPropertyData {
    value: string
    dice: number
    die: string
    damageType: string
    critDice: number
    critDie: string
    critDamage: string
    critDamageType: string
}

export interface MagicItemData {
    property1: MagicItemPropertyData
    property2: MagicItemPropertyData
    property3: MagicItemPropertyData
}

export interface BackpackDetailsData {
    capacity: {
        type: string,
        value: number,
        weightless: boolean
    }
    currency: {
        cp: 0,
        sp: 0,
        ep: 0,
        gp: 0,
        pp: 0
    }
}

export interface TreasureDetailsData {
    denomination: {
        value: 'pp' | 'gp' | 'sp' | 'cp'
    }
    value: {
        value: string
    }
}

export interface WeaponDetailsData {
    weaponType: {
        value: string
    },
    group: {
        value: string
    },
    hands: {
        value: boolean
    },
    bonus: {
        value: number
    },
    damage: {
        value: string,
        dice: number,
        die: string,
        damageType: string
    },
    bonusDamage: {
        value: string
    },
    range: {
        value: string
    },
    reload: {
        value: string
    },
    ability: {
        value: string
    },
    MAP: {
        value: string
    },
    potencyRune: {
        value: string
    },
    strikingRune: {
        value: string
    },
    propertyRune1: {
        value: string
    },
    propertyRune2: {
        value: string
    },
    propertyRune3: {
        value: string
    },
    propertyRune4: {
        value: string
    }
}

export interface ArmorDetailsData {
    armor: {
        value: number
    },
    armorType: {
        value: string
    },
    group: {
        value: string
    },
    strength: {
        value: number
    },
    dex: {
        value: number
    },
    check: {
        value: number
    },
    speed: {
        value: number
    },
    potencyRune: {
        value: string
    },
    resiliencyRune: {
        value: string
    },
    propertyRune1: {
        value: string
    },
    propertyRune2: {
        value: string
    },
    propertyRune3: {
        value: string
    },
    propertyRune4: {
        value: string
    }
}

export interface MeleeDetailsData {
    attack: {
        value: string
    }
    damageRolls: any,
    bonus: {
        value: number
    },
    attackEffects: {
        value: any[]
    }
}

export interface ConsumableDetailsData {
    consumableType: {
        value: string
    },
    uses: {
        value: number,
        max: number,
        per: any,
        autoUse: boolean,
        autoDestroy: boolean
    },
    charges: {
        value: number,
        max: number,
        _deprecated: boolean
    },
    consume: {
        value: string,
        _deprecated: boolean
    },
    autoUse: {
        value: boolean,
        _deprecated: boolean
    },
    autoDestroy: {
        value: boolean,
        _deprecated: boolean
    }
}

export interface FeatDetailsData {
    featType: {
        value: string
    }
    actionType: {
        value: string
    }
    actionCategory: {
        value: string
    }
    actions: {
        value: string
    }
    prerequisites: {
        value: string
    }
}

export interface LoreDetailsData {
    featType: string,
    mod: {
        value: 0
    },
    proficient: {
        value: 0
    },
    item: {
        value: 0
    }
}

export interface MartialDetailsData {
    proficient: {
        value: 0
    },
    item: {
        value: 0
    }
}

export interface ActionDetailsData {
    actionType: {
        value: string
    },
    actionCategory: {
        value: string
    },
    weapon: {
        value: string
    },
    actions: {
        value: string
    },
    requirements: {
        value: string
    },
    trigger: {
        value: string
    },
    skill_requirements: {
        skill: string,
        rank: string
    }
}

export interface SpellDetailsData {
    spellType: {
        value: string
    },
    spellCategory: {
        value: string
    },
    traditions: {
        value: []
    },
    school: {
        value: string
    },
    components: {
        value: string
    },
    materials: {
        value: string
    },
    target: {
        value: string
    },
    range: {
        value: string
    },
    area: {
        value: string
    },
    time: {
        value: string
    },
    duration: {
        value: string
    },
    damage: {
        value: string,
        applyMod: false
    },
    damageType: {
        value: string
    },
    scaling: {
        mode: string,
        formula: string
    },
    save: {
        basic: string
    },
    sustained: {
        value: false
    },
    cost: {
        value: string
    },
    ability: {
        value: string
    },
    prepared: {
        value: boolean
    },
    location: {
        value: string
    }
}

export interface SpellcastingEntryDetailsData {
    ability: {
        value: string
    },
    spelldc: {
        value: 0,
        dc: 0,
        item: 0,
        mod: 0
    },
    tradition: {
        value: string
    },
    focus: {
        points: 1,
        pool: 1
    },
    prepared: {
        value: string
    },
    showUnpreparedSpells: {
        value: false
    },
    item: {
        value: 0
    },
    proficiency: {
        value: 0
    },
    displayLevels: Record<number, boolean>
    slots: {
        slot0: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot1: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot2: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot3: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot4: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot5: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot6: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot7: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot8: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot9: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot10: {
            prepared: [],
            value: 0,
            max: 0
        },
        slot11: {
            prepared: [],
            value: 0,
            max: 0
        }
    }
}

export interface BackpackData extends BaseEntityData<BackpackDetailsData & ItemDescriptionData & PhysicalItemData & ItemLevelData> {
    type: 'backpack'
}

export interface TreasureData extends BaseEntityData<TreasureDetailsData & ItemDescriptionData & PhysicalItemData & ItemLevelData> {
    type: 'treasure'
}

export interface WeaponData extends BaseEntityData<WeaponDetailsData & ItemDescriptionData & PhysicalItemData & ItemLevelData & MagicItemData> {
    type: 'weapon'
}

export interface ArmorData extends BaseEntityData<ArmorDetailsData & ItemDescriptionData & PhysicalItemData & ItemLevelData & MagicItemData> {
    type: 'armor'
}

export interface MeleeData extends BaseEntityData<MeleeDetailsData & ItemDescriptionData & PhysicalItemData & MagicItemData> {
    type: 'melee'
}

export interface ConsumableData extends BaseEntityData<ConsumableDetailsData & ItemDescriptionData & PhysicalItemData & ActivatedEffectData & ItemLevelData> {
    type: 'consumable'
}

export interface EquipmentData extends BaseEntityData<ItemDescriptionData & ActivatedEffectData & MagicItemData> {
    type: 'equipment'
}

export interface FeatData extends BaseEntityData<FeatDetailsData & ItemDescriptionData & ItemLevelData> {
    type: 'feat'
}

export interface LoreData extends BaseEntityData<LoreDetailsData & ItemDescriptionData> {
    type: 'lore'
}

export interface MartialData extends BaseEntityData<MartialDetailsData & ItemDescriptionData> {
    type: 'martial'
}

export interface ActionData extends BaseEntityData<ActionDetailsData & ItemDescriptionData> {
    type: 'action'
}

export interface SpellData extends BaseEntityData<SpellDetailsData & ItemDescriptionData & ItemLevelData> {
    type: 'spell'
}

export interface SpellcastingEntryData extends BaseEntityData<SpellcastingEntryDetailsData & ItemDescriptionData> {
    type: 'spellcastingEntry'
}

export type ItemData = BackpackData | TreasureData | WeaponData | ArmorData | 
    MeleeData | ConsumableData | EquipmentData | FeatData | LoreData | MartialData |
    ActionData | SpellData | SpellcastingEntryData;

export function getPhysicalItemData(item: ItemData): BaseEntityData<PhysicalItemData> | null {
    if (item.type === 'backpack' ||
        item.type === 'treasure' ||
        item.type === 'weapon' ||
        item.type === 'armor' ||
        item.type === 'melee' ||
        item.type === 'consumable') {
        return item;
    }
    
    return null;
}