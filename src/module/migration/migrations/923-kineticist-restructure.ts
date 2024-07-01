import { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemPF2e } from "@item";
import { FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { ChoiceSetSource } from "@module/rules/rule-element/choice-set/data.ts";
import { GrantItemSource } from "@module/rules/rule-element/grant-item/rule-element.ts";
import { ElementTrait } from "@scripts/config/traits.ts";
import { objectHasKey, recursiveReplaceString, sluggify, tupleHasValue } from "@util/misc.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Move existing kineticists to the new class automation structure **/
export class Migration923KineticistRestructure extends MigrationBase {
    static override version = 0.923;

    override async updateActor(actorSource: ActorSourcePF2e): Promise<void> {
        if (actorSource.type !== "character") return;

        // If this actor already has a modern gate item, skip
        if (actorSource.items.some((i) => tupleHasValue(i.system.traits?.otherTags ?? [], "kineticist-kinetic-gate"))) {
            return;
        }

        // Retrieve certain kineticist items we plan to update. If they don't exist, skip
        const actorFeats = actorSource.items.filter((i): i is FeatSource => itemIsOfType(i, "feat"));
        const kineticGate = actorFeats.find((i) => (i.system.slug ?? sluggify(i.name)) === "kinetic-gate");
        const impulses = actorFeats.find((i) => (i.system.slug ?? sluggify(i.name)) === "impulses");
        if (!kineticGate || !impulses) return;

        // Extract every kineticist build decision. We need to recreate all of these decisions
        const decisions = this.#extractKineticistDecisions(actorSource, kineticGate);

        // Update impulses independently
        impulses.system.rules = [
            {
                extends: "kineticist",
                key: "SpecialStatistic",
                label: "PF2E.TraitImpulse",
                slug: "impulse",
                type: "attack-roll",
            },
            {
                key: "GrantItem",
                uuid: "Compendium.pf2e.actionspf2e.Item.6lbr0Jnv0zMB5uGb",
                flag: "elementalBlast",
            },
            {
                key: "GrantItem",
                predicate: ["class:kineticist"],
                uuid: "Compendium.pf2e.actionspf2e.Item.nTBrvt2b9wngyr0i",
                flag: "baseKinesis",
            } as GrantItemSource,
        ] as RuleElementSource[];

        // Remove the gate junction item, this will be recreated in an entirely new way when we do the thresholds
        const gateJunction = actorSource.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "gate-junction");
        const gateJunctionIdx = gateJunction ? actorSource.items.indexOf(gateJunction) : -1;
        if (gateJunctionIdx >= 0) {
            actorSource.items.splice(gateJunctionIdx, 1);
        }

        // Create method to connect a skill feat to an element feat via grants
        const junctionFeats = actorFeats.filter((f) => f.flags.pf2e?.grantedBy?.id === gateJunction?._id);
        const connectSkillFeats = (element: string, elementFeat: FeatSource) => {
            const skillFeat = junctionFeats.find((s) => s.system.slug === this.#elementSkillFeats[element]);
            if (skillFeat) this.#addGrantedItem(actorSource, { parent: elementFeat, child: skillFeat });
        };

        // Update Kinetic Gate Rules and Grants
        kineticGate.name = kineticGate.name.replace(/\s*\(\w+\)$/, "").replace(/\s*\(\w+\)$/, "");
        kineticGate.system.rules = R.clone(KINETIC_GATE_RULES);
        this.#setChoice(kineticGate, "kinetic-gate:initial", decisions.initial.choice);
        this.#wipeGrants(kineticGate);
        for (const [idx, data] of decisions.initial.elements.entries()) {
            const { element, feats } = data;
            const elementNumberString = idx === 0 ? "One" : "Two";

            const uuid = this.#elementMap.get(element);
            if (uuid) {
                this.#setChoice(kineticGate, `element${elementNumberString}`, uuid);
            }

            const elementFeat = uuid ? await this.#loadFeatSource(uuid) : null;
            if (!elementFeat) continue;

            const grantUUID = `{item|flags.pf2e.rulesSelections.element${elementNumberString}}`;
            this.#addGrantedItem(actorSource, { parent: kineticGate, child: elementFeat, grantUUID });

            // Now attach the granted feats.
            for (const [idx, feat] of feats.entries()) {
                const impulseNumberString = idx === 0 ? "One" : "Two";
                this.#setChoice(elementFeat, `impulse${impulseNumberString}`, feat.flags.core?.sourceId);
                this.#addGrantedItem(actorSource, {
                    parent: elementFeat,
                    child: feat,
                    grantUUID: `{item|flags.pf2e.rulesSelections.impulse${impulseNumberString}}`,
                });
            }

            // Connect any skill feats and ensure unresolved choice sets don't ruin everything in the future
            connectSkillFeats(element, elementFeat);
            this.#wipeEmptyChoices(elementFeat);
        }

        // Process each gate's threshold
        for (const threshold of decisions.thresholds) {
            const { thresholdItem, element } = threshold;
            thresholdItem.system.rules = GATES_THRESHOLD_RULES(thresholdItem.system.level.value);
            this.#wipeGrants(thresholdItem);

            // Set the choice property for the threshold
            this.#setChoice(thresholdItem, "threshold", threshold.choice);

            // The difference between each threshold is certain options that point to first-threshold/second-threshold/etc
            if (threshold.slug !== "gates-threshold") {
                const thisThreshold = threshold.slug.replace("gates-", "");
                recursiveReplaceString(thresholdItem.system.rules, (str) =>
                    str.replace("first-threshold", thisThreshold),
                );
            }

            const elementLabel = game.i18n.localize(CONFIG.PF2E.elementTraits[element as ElementTrait]);

            // Process what happens if the element forks
            if (threshold.choice === "fork") {
                thresholdItem.name = game.i18n.format("PF2E.SpecificRule.Kineticist.KineticGate.ForkThePath.Rename", {
                    elementFork: elementLabel,
                });

                const uuid = this.#elementMap.get(element);
                const elementFeat = uuid ? await this.#loadFeatSource(uuid) : null;
                if (!elementFeat) continue; // this shouldn't ever happen

                this.#setChoice(thresholdItem, "elementFork", uuid);
                this.#addGrantedItem(actorSource, {
                    parent: thresholdItem,
                    child: elementFeat,
                    grantUUID: "{item|flags.pf2e.rulesSelections.elementFork}",
                });

                if (threshold.featItem) {
                    this.#setChoice(elementFeat, "impulseOne", threshold.featItem.flags.core?.sourceId);
                    this.#addGrantedItem(actorSource, {
                        parent: elementFeat,
                        child: threshold.featItem,
                        grantUUID: "{item|flags.pf2e.rulesSelections.impulseOne}",
                    });
                }

                // Connect any skill feats and ensure unresolved choice sets don't ruin everything in the future
                connectSkillFeats(element, elementFeat);
                this.#wipeEmptyChoices(elementFeat);
            }

            // Process what happens if we selected a gate junction
            if (threshold.choice === "expand") {
                thresholdItem.name = game.i18n.format(
                    "PF2E.SpecificRule.Kineticist.KineticGate.ExpandThePortal.Rename",
                    { elementOne: elementLabel },
                );
                this.#setChoice(thresholdItem, "elementOne", element);

                const gateJunctionFeat = await this.#loadFeatSource(this.#gateJunctionFeat);
                if (gateJunctionFeat && threshold.junction) {
                    gateJunctionFeat.system.rules = GATE_JUNCTION_RULES(element);
                    this.#addGrantedItem(actorSource, { parent: thresholdItem, child: gateJunctionFeat });
                    this.#setChoice(gateJunctionFeat, "junction", threshold.junction);

                    if (objectHasKey(JUNCTION_LABELS, threshold.junction)) {
                        const label = game.i18n.localize(JUNCTION_LABELS[threshold.junction]);
                        gateJunctionFeat.name += ` (${label})`;
                    }
                }

                if (threshold.featItem) {
                    this.#setChoice(thresholdItem, "impulseExpand", threshold.featItem.flags.core?.sourceId);
                    this.#addGrantedItem(actorSource, {
                        parent: thresholdItem,
                        child: threshold.featItem,
                        grantUUID: "{item|flags.pf2e.rulesSelections.impulseExpand}",
                    });
                }

                // Ensure unresolved choice sets don't ruin everything in the future
                if (gateJunctionFeat) this.#wipeEmptyChoices(gateJunctionFeat);
            }
        }
    }

    #elementMap: Map<string, ItemUUID> = new Map([
        ["air", "Compendium.pf2e.classfeatures.Item.X11Y3T1IzmtNqGMV"],
        ["earth", "Compendium.pf2e.classfeatures.Item.dEm00L1XFXFCH2wS"],
        ["fire", "Compendium.pf2e.classfeatures.Item.PfeDtJBJdUun0THS"],
        ["metal", "Compendium.pf2e.classfeatures.Item.21JjdNW0RQ2LfaH3"],
        ["water", "Compendium.pf2e.classfeatures.Item.MvunDFH8Karxee0t"],
        ["wood", "Compendium.pf2e.classfeatures.Item.8X8db58vKx21L0Dr"],
    ]);

    #elementSkillFeats: Record<string, string> = {
        air: "experienced-smuggler",
        earth: "hefty-hauler",
        fire: "intimidating-glare",
        metal: "quick-repair",
        water: "underwater-marauder",
        wood: "terrain-expertise",
    };

    #gateJunctionFeat: ItemUUID = "Compendium.pf2e.classfeatures.Item.jx70hPakuTgB3lM5";

    async #loadFeatSource(uuid: ItemUUID): Promise<FeatSource | null> {
        const item = await fromUuid<ItemPF2e>(uuid);
        const source: ItemSourcePF2e | null = item?.toObject(true) ?? null;
        if (!source || !itemIsOfType(source, "feat")) return null;
        source._id = fu.randomID();
        return source;
    }

    #addGrantedItem(
        actorSource: ActorSourcePF2e,
        options: { parent: ItemSourcePF2e; child: ItemSourcePF2e; grantUUID?: string | null },
    ) {
        const { child, parent } = options;
        if (!parent._id || !child._id) return;

        const childSlug = sluggify(child.system.slug ?? child.name, { camel: "dromedary" });
        parent.flags.pf2e ??= {};
        parent.flags.pf2e.itemGrants ??= {};
        parent.flags.pf2e.itemGrants[childSlug] = { id: child._id, onDelete: "detach" };
        if (`-=${childSlug}` in parent.flags.pf2e.itemGrants) {
            delete parent.flags.pf2e.itemGrants[`-=${childSlug}`];
        }

        child.flags.pf2e ??= {};
        child.flags.pf2e.grantedBy = { id: parent._id, onDelete: "cascade" };

        const grantUUID = options.grantUUID ?? child.flags.core?.sourceId;
        const grant = parent.system.rules.find(
            (r): r is GrantItemSource => r.key === "GrantItem" && "uuid" in r && r.uuid === grantUUID,
        );
        if (grant) {
            grant.flag = childSlug;
        }

        // Add to actor source if not already there
        if (!actorSource.items.includes(child)) {
            actorSource.items.push(child);
        }
    }

    #wipeGrants(item: ItemSourcePF2e) {
        if (!item?.flags.pf2e?.itemGrants) return;

        const grants: Record<string, unknown> = item.flags.pf2e.itemGrants;
        for (const key of Object.keys(grants)) {
            if (!key.startsWith("-=")) grants[`-=${key}`] = null;
        }
    }

    /**
     * Wipes all choice sets with no selection. Used for imported item so that changes in them don't cause too big a break, becuase choice sets without selections block processing
     * This is important for elements
     */
    #wipeEmptyChoices(item: ItemSourcePF2e) {
        item.system.rules = item.system.rules.filter((r) => r.key !== "ChoiceSet" || ("selection" in r && r.selection));
    }

    #setChoice(item: FeatSource, flagOrOption: string, selection?: string) {
        const rule = item?.system.rules.find(
            (r): r is ChoiceSetSource =>
                r.key === "ChoiceSet" &&
                (("flag" in r && r.flag === flagOrOption) || ("rollOption" in r && r.rollOption === flagOrOption)),
        );

        if (rule && selection) rule.selection = selection;
    }

    /** Extracts all kineticist choices, with the goal of reapplying them with new rules */
    #extractKineticistDecisions(actorSource: ActorSourcePF2e, kineticGate: FeatSource): KineticistDecisions {
        function getChoice(item?: ItemSourcePF2e, flag?: string): string | null {
            const selection = item?.system.rules.find(
                (r): r is ChoiceSetSource => r.key === "ChoiceSet" && "flag" in r && r.flag === flag,
            )?.selection;
            return selection ? String(selection) : null;
        }

        const thresholdSlugs = [
            "gates-threshold",
            "second-gates-threshold",
            "third-gates-threshold",
            "fourth-gates-threshold",
        ];

        const actorFeats = actorSource.items.filter((i): i is FeatSource => itemIsOfType(i, "feat"));
        const initialChoice = getChoice(kineticGate, "kineticGate") === "dual-gate" ? "dual-gate" : "single-gate";
        const elements = [getChoice(kineticGate, "elementOne"), getChoice(kineticGate, "elementTwo")].filter(
            R.isTruthy,
        );
        const initialFeats = actorFeats.filter(
            (i) =>
                i.flags.pf2e?.grantedBy?.id === kineticGate._id &&
                tupleHasValue(i.system.traits.value ?? [], "impulse"),
        );

        return {
            initial: {
                choice: initialChoice,
                elements: elements.map((element, idx) => ({
                    element,
                    feats: elements.length === 1 ? initialFeats : [initialFeats[idx]],
                })),
            },
            thresholds: thresholdSlugs
                .map((slug) => {
                    const thresholdItem = actorFeats.find((i) => (i.system.slug ?? sluggify(i.name)) === slug);
                    if (!thresholdItem) return null;
                    const choice = getChoice(thresholdItem, sluggify(slug, { camel: "dromedary" }));
                    if (!tupleHasValue(["fork", "expand"], choice)) return null;

                    // Get the element. The first choice isn't necessary and the rest should resolve normally, but we tested with it so best not to risk it
                    const element =
                        getChoice(thresholdItem, choice === "expand" ? "elementExpand" : "elementFork") ??
                        getChoice(thresholdItem, "element") ??
                        getChoice(thresholdItem, "elementExpand") ??
                        getChoice(thresholdItem, "elementFork");
                    if (!element) return null;

                    return {
                        slug,
                        thresholdItem,
                        choice,
                        element,
                        junction: choice === "expand" ? getChoice(thresholdItem, "junction") : null,
                        featItem: actorFeats.find(
                            (i) =>
                                i.flags.pf2e?.grantedBy?.id === thresholdItem._id &&
                                tupleHasValue(i.system.traits.value ?? [], "impulse"),
                        ),
                    };
                })
                .filter(R.isTruthy),
        };
    }
}

interface KineticistDecisions {
    initial: {
        choice: "single-gate" | "dual-gate";
        elements: { element: string; feats: FeatSource[] }[];
    };
    thresholds: ThresholdChoice[];
}

interface ThresholdChoice {
    slug: string;
    thresholdItem: FeatSource;
    choice: "fork" | "expand";
    element: string;
    junction?: string | null;
    featItem?: FeatSource;
}

const JUNCTION_LABELS = {
    aura: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.Aura",
    critical: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.CriticalBlast",
    resistance: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.ElementalResistance",
    impulse: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.Impulse",
    skill: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.Skill",
};

const KINETIC_GATE_RULES = [
    {
        key: "ActiveEffectLike",
        mode: "override",
        path: "flags.pf2e.kineticist.elements",
        priority: 19,
        value: [],
    },
    {
        key: "ActiveEffectLike",
        mode: "override",
        path: "flags.pf2e.kineticist.gate",
        priority: 49,
        value: {
            five: null,
            four: null,
            one: null,
            six: null,
            three: null,
            two: null,
        },
    },
    {
        adjustName: false,
        choices: [
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.DualGate.Label",
                value: "dual-gate",
            },
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.SingleGate",
                value: "single-gate",
            },
        ],
        key: "ChoiceSet",
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.Gate",
        flag: "kineticGate",
        rollOption: "kinetic-gate:initial",
    },
    {
        adjustName: false,
        choices: {
            filter: ["item:tag:kineticist-kinetic-gate"],
        },
        flag: "elementOne",
        key: "ChoiceSet",
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.Element",
        rollOption: "kinetic-gate:first-element",
    } as ChoiceSetSource,
    {
        key: "GrantItem",
        uuid: "{item|flags.pf2e.rulesSelections.elementOne}",
    },
    {
        adjustName: false,
        choices: {
            filter: ["item:tag:kineticist-kinetic-gate"],
        },
        flag: "elementTwo",
        key: "ChoiceSet",
        predicate: ["kinetic-gate:initial:dual-gate"],
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.Element",
        rollOption: "kinetic-gate:second-element",
    } as ChoiceSetSource,
    {
        key: "GrantItem",
        uuid: "{item|flags.pf2e.rulesSelections.elementTwo}",
    },
    {
        domain: "all",
        key: "RollOption",
        option: "junction:{item|flags.pf2e.rulesSelections.elementOne}:impulse",
        predicate: ["kinetic-gate:initial:single-gate"],
    },
];

const GATES_THRESHOLD_RULES = (level: number) => [
    {
        choices: [
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.ExpandThePortal.Label",
                value: "expand",
            },
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.ForkThePath.Label",
                value: "fork",
            },
        ],
        key: "ChoiceSet",
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.Threshold",
        rollOption: "kinetic-gate:first-threshold",
        flag: "threshold",
    },
    {
        actorFlag: true,
        adjustName: "PF2E.SpecificRule.Kineticist.KineticGate.ExpandThePortal.Rename",
        choices: "flags.pf2e.kineticist.elements",
        flag: "elementOne",
        key: "ChoiceSet",
        predicate: ["kinetic-gate:first-threshold:expand"],
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.ExpandElement",
    },
    {
        key: "GrantItem",
        predicate: ["kinetic-gate:first-threshold:expand"],
        uuid: "Compendium.pf2e.classfeatures.Item.jx70hPakuTgB3lM5",
    },
    {
        adjustName: "PF2E.SpecificRule.Kineticist.KineticGate.ForkThePath.Rename",
        choices: {
            filter: ["item:tag:kineticist-kinetic-gate"],
        },
        flag: "elementFork",
        key: "ChoiceSet",
        predicate: ["kinetic-gate:first-threshold:fork"],
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.Element",
    },
    {
        allowDuplicate: false,
        key: "GrantItem",
        uuid: "{item|flags.pf2e.rulesSelections.elementFork}",
    },
    {
        adjustName: false,
        choices: {
            filter: [
                "item:rarity:common",
                "item:trait:impulse",
                {
                    lte: ["item:level", level],
                },
                {
                    or: [
                        {
                            and: [
                                {
                                    or: [
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.one}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.two}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.three}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.four}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.five}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.six}",
                                    ],
                                },
                                {
                                    not: "item:trait:composite",
                                },
                            ],
                        },
                        {
                            and: [
                                {
                                    not: {
                                        xor: [
                                            "item:trait:{actor|flags.pf2e.kineticist.gate.one}",
                                            "item:trait:{actor|flags.pf2e.kineticist.gate.two}",
                                            "item:trait:{actor|flags.pf2e.kineticist.gate.three}",
                                            "item:trait:{actor|flags.pf2e.kineticist.gate.four}",
                                            "item:trait:{actor|flags.pf2e.kineticist.gate.five}",
                                            "item:trait:{actor|flags.pf2e.kineticist.gate.six}",
                                        ],
                                    },
                                },
                                {
                                    or: [
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.one}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.two}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.three}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.four}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.five}",
                                        "item:trait:{actor|flags.pf2e.kineticist.gate.six}",
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            itemType: "feat",
        },
        flag: "impulseExpand",
        key: "ChoiceSet",
        predicate: ["kinetic-gate:first-threshold:expand"],
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.Impulse",
    },
    {
        allowDuplicate: false,
        key: "GrantItem",
        uuid: "{item|flags.pf2e.rulesSelections.impulseExpand}",
    },
];

/** Because of the way gate junction relies on specific actor import order, we must hardcode the element */
const GATE_JUNCTION_RULES = (element: string) => [
    {
        choices: [
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.Aura",
                predicate: [
                    {
                        not: `junction:${element}:aura`,
                    },
                ],
                value: "aura",
            },
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.CriticalBlast",
                predicate: [
                    {
                        not: `junction:${element}:critical`,
                    },
                ],
                value: "critical",
            },
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.ElementalResistance",
                predicate: [
                    {
                        not: `junction:${element}:resistance`,
                    },
                ],
                value: "resistance",
            },
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.Impulse",
                predicate: [
                    {
                        not: `junction:${element}:impulse`,
                    },
                ],
                value: "impulse",
            },
            {
                label: "PF2E.SpecificRule.Kineticist.KineticGate.Junction.Skill",
                predicate: [
                    {
                        not: `junction:${element}:skill`,
                    },
                ],
                value: "skill",
            },
        ],
        flag: "junction",
        key: "ChoiceSet",
        prompt: "PF2E.SpecificRule.Kineticist.KineticGate.Prompt.Junction",
    },
    {
        domain: "all",
        key: "RollOption",
        option: `junction:${element}:{item|flags.pf2e.rulesSelections.junction}`,
    },
];
