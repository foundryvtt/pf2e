import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Replace critical specialization roll notes with CritSpec RE */
export class Migration759CritSpecRE extends MigrationBase {
    static override version = 0.759;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!["feat", "weapon"].includes(source.type)) return;

        const critSpecKey = "CriticalSpecialization";
        if (source.system.rules.some((r) => r.key === critSpecKey)) {
            return;
        }

        switch (source.system.slug) {
            case "archer-dedication": {
                source.system.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: ["weapon:group:bow", { gte: ["weapon:proficiency:rank", 2] }],
                    },
                });
                return;
            }
            case "azarketi-weapon-aptitude": {
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = source.system.rules.filter((r) => r.key !== "Note");
                source.system.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: ["self:effect:rage", "weapon:melee"],
                    },
                });
                return;
            }
            case "catfolk-weapon-rake": {
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = source.system.rules.filter((r) => r.key !== "Note");
                source.system.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: [{ gte: ["weapon:proficiency:rank", 3] }],
                    },
                });
                return;
            }
            case "genie-weapon-flourish": {
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: { all: ["weapon:trait:goblin"] },
                    },
                ];
                return;
            }
            case "grippli-weapon-innovator": {
                source.system.rules = [
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
                source.system.rules = source.system.rules.filter((r) => r.key !== "Note");
                source.system.rules.push({
                    key: critSpecKey,
                    predicate: {
                        any: ["weapon:group:firearm", "weapon:tag:crossbow"],
                    },
                });
                return;
            }
            case "halfling-weapon-trickster": {
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = [
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
                source.system.rules = [
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
            case "mauler-dedication": {
                source.system.rules.push({
                    key: "CriticalSpecialization",
                    predicate: {
                        all: [
                            "weapon:melee",
                            { or: ["weapon:category:simple", "weapon:category:martial"] },
                            {
                                or: [
                                    "weapon:usage:hands:2",
                                    "weapon:trait:two-hand-d6",
                                    "weapon:trait:two-hand-d8",
                                    "weapon:trait:two-hand-d10",
                                    "weapon:trait:two-hand-d12",
                                ],
                            },
                        ],
                    },
                });
                return;
            }
            case "orc-weapon-carnage": {
                source.system.rules = [
                    {
                        key: "CriticalSpecialization",
                        predicate: {
                            any: ["weapon:trait:orc", "weapon:base:falchion", "weapon:base:greataxe"],
                        },
                    },
                ];
                return;
            }
            case "ranger-weapon-expertise": {
                source.system.rules = source.system.rules.filter((r) => r.key !== "Note");
                source.system.rules.push({
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
                source.system.rules.push(rule);
                return;
            }
            case "student-of-the-staff": {
                source.system.rules = source.system.rules.filter((r) => r.key !== "Note");
                source.system.rules.unshift({
                    key: critSpecKey,
                    predicate: { all: ["weapon:base:staff"] },
                });
                return;
            }
            case "sun-sling": {
                source.system.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: ["weapon:id:{item|_id}", "feat:suns-fury"],
                    },
                });
                return;
            }
            case "suns-fury": {
                source.system.rules = [];
                return;
            }
            case "third-doctrine-warpriest": {
                source.system.rules.push({
                    key: critSpecKey,
                    predicate: { all: ["weapon:deity-favored"] },
                });
                return;
            }
            case "vanths-weapon-execution": {
                source.system.rules = [
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
                source.system.rules = source.system.rules.filter((r) => r.key !== "Note");
                source.system.rules.push({
                    key: critSpecKey,
                    predicate: {
                        all: [{ gte: ["weapon:proficiency:rank", 2] }],
                    },
                });
                return;
            }
            case "weapon-tricks": {
                source.system.rules = source.system.rules.filter((r) => r.key !== "Note");
                source.system.rules.push({
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
