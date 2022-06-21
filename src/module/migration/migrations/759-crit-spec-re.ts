import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Replace critical specialization roll notes with CritSpec RE */
export class Migration759CritSpecRE extends MigrationBase {
    static override version = 0.759;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!["feat", "weapon"].includes(source.type)) return;

        const critSpecKey = "CriticalSpecialization";
        if (source.data.rules.some((r) => r.key === critSpecKey)) {
            return;
        }

        switch (source.data.slug) {
            case "archer-dedication": {
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: ["weapon:group:bow", { gte: ["weapon:proficiency:rank", 2] }],
                    },
                });
                return;
            }
            case "azarketi-weapon-aptitude": {
                source.data.rules = [
                    {
                        key: critSpecKey,
                        predicate: {
                            any: [
                                "weapon:trait:azarketi",
                                "weapon:base:crossbow",
                                "weapon:base:hand-crossbow",
                                "weapon:base:longspear",
                                "weapon:base:spear",
                                "weapon:base:trident",
                            ],
                        },
                    },
                ];
                return;
            }
            case "brawling-focus": {
                source.data.rules = [
                    {
                        key: critSpecKey,
                        predicate: {
                            any: [
                                "weapon:group:brawling",
                                {
                                    and: [
                                        "feat:monastic-weaponry",
                                        "weapon:trait:monk",
                                        { not: "weapon:category:unarmed" },
                                        { gte: ["weapon:proficiency:rank", 1] },
                                    ],
                                },
                            ],
                        },
                    },
                ];
                return;
            }
            case "brutality": {
                source.data.rules = source.data.rules.filter((r) => r.key !== "Note");
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: ["self:effect:rage", "weapon:melee"],
                    },
                });
                return;
            }
            case "catfolk-weapon-rake": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:catfolk",
                                "weapon:base:hatchet",
                                "weapon:base:kama",
                                "weapon:base:kukri",
                                "weapon:base:scimitar",
                                "weapon:base:sickle",
                            ],
                        },
                    },
                ];
                return;
            }
            case "conrasu-weapon-understanding": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:conrasu",
                                "weapon:base:glaive",
                                "weapon:base:longspear",
                                "weapon:base:longsword",
                                "weapon:base:shortbow",
                                "weapon:base:spear",
                            ],
                        },
                    },
                ];
                return;
            }
            case "dwarven-weapon-cunning": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:dwarf",
                                "weapon:base:battle-axe",
                                "weapon:base:pick",
                                "weapon:base:warhammer",
                            ],
                        },
                    },
                ];
                return;
            }
            case "elven-weapon-elegance": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:elf",
                                "weapon:base:longbow",
                                "weapon:base:longsword",
                                "weapon:base:rapier",
                                "weapon:base:shortbow",
                            ],
                        },
                    },
                ];
                return;
            }
            case "fighter-weapon-mastery": {
                source.data.rules = source.data.rules.filter((r) => r.key !== "Note");
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: [{ gte: ["weapon:proficiency:rank", 3] }],
                    },
                });
                return;
            }
            case "genie-weapon-flourish": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:geniekin",
                                "weapon:base:falchion",
                                "weapon:base:ranseur",
                                "weapon:base:scimitar",
                                "weapon:base:trident",
                            ],
                        },
                    },
                ];
                return;
            }
            case "gnoll-weapon-practicality": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:gnoll",
                                "weapon:base:flail",
                                "weapon:base:khopesh",
                                "weapon:base:mambele",
                                "weapon:base:spear",
                                "weapon:base:war-flail",
                            ],
                        },
                    },
                ];
                return;
            }
            case "gnome-weapon-innovator": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: ["weapon:trait:gnome", "weapon:base:glaive", "weapon:base:kukri"],
                        },
                    },
                ];
                return;
            }
            case "goblin-weapon-frenzy": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: { all: ["weapon:trait:goblin"] },
                    },
                ];
                return;
            }
            case "grippli-weapon-innovator": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:grippli",
                                "weapon:base:blowgun",
                                "weapon:base:hatchet",
                                "weapon:base:scythe",
                                "weapon:base:shortbow",
                            ],
                        },
                    },
                ];
                return;
            }
            case "gunslinger-weapon-mastery": {
                source.data.rules = source.data.rules.filter((r) => r.key !== "Note");
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: {
                        any: ["weapon:group:firearm", "weapon:tag:crossbow"],
                    },
                });
                return;
            }
            case "halfling-weapon-trickster": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: ["weapon:trait:halfling", "weapon:base:shortsword", "weapon:base:sling"],
                        },
                    },
                ];
                return;
            }
            case "hobgoblin-weapon-discipline": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: ["weapon:group:polearm", "weapon:group:spear", "weapon:group:sword"],
                        },
                    },
                ];
                return;
            }
            case "improvised-critical": {
                source.data.rules = [
                    {
                        key: critSpecKey,
                        predicate: {
                            all: ["weapon:tag:improvised"],
                        },
                    },
                ];
                return;
            }
            case "kobold-weapon-innovator": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:trait:kobold",
                                "weapon:base:crossbow",
                                "weapon:base:greatpick",
                                "weapon:base:light-pick",
                                "weapon:base:pick",
                                "weapon:base:spear",
                            ],
                        },
                    },
                ];
                return;
            }
            case "orc-weapon-carnage": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: ["weapon:trait:orc", "weapon:group:falchion", "weapon:group:greataxe"],
                        },
                    },
                ];
                return;
            }
            case "ranger-weapon-expertise": {
                source.data.rules = source.data.rules.filter((r) => r.key !== "Note");
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: ["hunted-prey"],
                        any: ["weapon:category:simple", "weapon:category:martial"],
                    },
                });
                return;
            }
            case "spike-launcher": {
                const rule = {
                    key: critSpecKey,
                    alternate: true,
                    predicate: {
                        all: ["weapon:id:{item|_id}"],
                    },
                    text: "PF2E.Item.Weapon.CriticalSpecialization.bow",
                };
                source.data.rules.push(rule);
                return;
            }
            case "student-of-the-staff": {
                source.data.rules = source.data.rules.filter((r) => r.key !== "Note");
                source.data.rules.unshift({
                    key: critSpecKey,
                    predicate: { all: ["weapon:group:club"] },
                });
                return;
            }
            case "third-doctrine-warpriest": {
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: { all: ["weapon:deity-favored"] },
                });
                return;
            }
            case "vanths-weapon-execution": {
                source.data.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: [
                                "weapon:base:bo-staff",
                                "weapon:base:longbow",
                                "weapon:base:scythe",
                                "weapon:base:staff",
                            ],
                        },
                    },
                ];
                return;
            }
            case "weapon-expertise-swashbuckler": {
                source.data.rules = source.data.rules.filter((r) => r.key !== "Note");
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: [{ gte: ["weapon:proficiency:rank", 2] }],
                    },
                });
                return;
            }
            case "weapon-tricks": {
                source.data.rules = source.data.rules.filter((r) => r.key !== "Note");
                source.data.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: ["target:condition:flat-footed"],
                        any: [
                            {
                                and: [
                                    { or: ["weapon:trait:agile", "weapon:trait:finesse"] },
                                    { or: ["weapon:category:simple", "weapon:category:unarmed"] },
                                ],
                            },
                            "weapon:base:rapier",
                            "weapon:base:sap",
                            "weapon:base:shortbow",
                            "weapon:base:shortsword",
                        ],
                    },
                });
                return;
            }
        }
    }
}
