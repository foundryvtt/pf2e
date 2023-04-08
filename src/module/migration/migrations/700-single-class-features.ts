import { ABCFeatureEntryData } from "@item/abc/data.ts";
import { ClassSource, FeatSource, ItemSourcePF2e } from "@item/data/index.ts";
import { isObject, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Consolidate all class features with multiple instances for different levels to single items */
export class Migration700SingleClassFeatures extends MigrationBase {
    static override version = 0.7;

    /** The first ID of each feature is the one that will stay */
    private itemIds: Record<string, string[]> = {
        alertness: ["D8CSi8c9XiRpVc5M", "OZaJz4exCoz6vuuv", "qJ4fwGpoNC36ZQ8I", "2o1Cj7hDayDlslqY", "TAIOtk5VvPZvv4nu"],
        "armor-expertise": ["x5jaCJxsmD5sx3KB", "fRifyINZF5SKDfib"],
        "armor-mastery": ["CGB1TczFhQhdQxml", "IPDwS5pTgU3Cq6Nl"],
        evasion: ["MV6XIuAgN9uSA0Da", "EZuWfYSv3ASLyKtu", "DqWr3LqUpT3Xi2xq"],
        "expert-spellcaster": ["cD3nSupdCvONuHiE", "mdzk070ixIDpid7V"],
        "great-fortitude": ["F57Na5VxfBp56kke", "25GSAotUcDwInYgG"],
        "improved-evasion": ["L5D0NwFXdLiVSnk5", "6XwGONPdr9SFDtDc"],
        "incredible-senses": ["nLwPMPLRne1HnL00", "iyb5FU2BpsCCan8Q", "kktZhQPJgC5F4hgU"],
        "iron-will": ["wMyDcVNmA7xGK83S", "JVCxv4HuLaaFhAf4"],
        juggernaut: [
            "OMZs5y16jZRW9KQK",
            "sHCFQZM0xHCOYOId",
            "Ba97T4anGhizfaCt",
            "pzTRQxuoNOeWAalC",
            "ojB0UJWpSekQPjT7",
        ],
        "lightning-reflexes": [
            "TUOeATt52P43r5W0",
            "rz87RgR1crWTd7j5",
            "Xqd0vrxq2bLXxdaB",
            "tfugXJHITCnArN1b",
            "7PzcKaDGy6tIkQh4",
            "EJzjY6AIsTYqW0ee",
        ],
        "magical-fortitude": ["70jqXP2eS4tRZ0Ok", "MzyPNlxrNA5OKVd7"],
        "master-spellcaster": ["l1InYvhnQSz6Ucxc", "zu9PcxvfoZlqQVk5"],
        "medium-armor-expertise": ["FCEp9jjxxgRJDJV3", "tzUaTqB6GHAeffOl"],
        "medium-armor-mastery": ["cGMSYAErbUG5E8X2", "NcEpvnIZfKzG1Iou"],
        resolve: ["JQAujUXjczVnYDEI", "D2g6sZQAWaTccviQ", "vv63fioCtOvDIdF2", "9WjZSliQZJlyGvUi"],
        "vigilant-senses": ["0npO4rPscGm0dX13", "NTp146fjLreL5zsj"],
        "weapon-expertise": ["9XLUh9iMepZesdmc", "F5BHEav90oOJ2LwN", "O99eXctsEjEpuBwe"],
        "weapon-specialization": ["9EqIasqfI8YIM3Pt", "WiM7X4xmpMx4s6LD", "1NGTc0gqEtwaFqUK"],
    };

    private features = [
        "Alertness",
        "Armor Expertise",
        "Armor Mastery",
        "Evasion",
        "Expert Spellcaster",
        "Great Fortitude",
        "Improved Evasion",
        "Incredible Senses",
        "Iron Will",
        "Juggernaut",
        "Lightning Reflexes",
        "Magical Fortitude",
        "Master Spellcaster",
        "Medium Armor Expertise",
        "Medium Armor Mastery",
        "Resolve",
        "Vigilant Senses",
        "Weapon Expertise",
        "Weapon Specialization",
    ].map((name) => ({ slug: sluggify(name), name }));

    /** Update the reference ID and name of the each feature entry */
    #migrateClass(itemSource: ClassSource): void {
        for (const refId in itemSource.system.items) {
            const itemRef: ABCFeatureEntryData & { id?: string } = itemSource.system.items[refId];
            itemRef.level = Number(itemRef.level) || 1;

            for (const feature of this.features) {
                if (itemSource.system.slug === "swashbuckler" && feature.slug === "weapon-expertise") continue;
                if (this.itemIds[feature.slug].includes(itemRef.id ?? "")) {
                    itemRef.id = this.itemIds[feature.slug][0];
                    itemRef.name = feature.name;
                }
            }
        }
    }

    /** Update the name, slug, and traits of each feature */
    #migrateFeature(source: FeatSource): void {
        if (!this.#isClassFeature(source)) return;

        for (const feature of this.features) {
            if (source.system.slug === "swashbuckler" && feature.slug === "weapon-expertise") continue;
            if (source.system.slug?.startsWith(`${feature.slug}-level-`)) {
                source.system.slug = feature.slug;
                if (source.name.startsWith(`${feature.name} `)) source.name = feature.name;
                source.system.traits.value = [];
            }
        }
    }

    #isClassFeature(source: ItemSourcePF2e): source is FeatSource & { system: { featType: "classfeature" } } {
        return (
            source.type === "feat" &&
            "featType" in source.system &&
            isObject<{ value: string }>(source.system.featType) &&
            source.system.featType.value === "classfeature"
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "class") {
            this.#migrateClass(source);
        } else if (source.type === "feat") {
            this.#migrateFeature(source);
        }
    }
}
