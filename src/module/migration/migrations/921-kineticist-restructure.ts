import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemPF2e } from "@item";
import { FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { ChoiceSetSource } from "@module/rules/rule-element/choice-set/data.ts";
import { sluggify } from "@util/misc.ts";
import { MigrationBase } from "../base.ts";

/** Move existing kineticists to the new class automation structure **/
export class Migration921KineticistRestructure extends MigrationBase {
    static override version = 0.921;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        const kineticGate = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "kinetic-gate");
        const impulses = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "impulses");
        const gateJunction = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "gates-junction");
        if (!kineticGate || !impulses) return;

        const kineticGateRules = [
            {
                key: "ActiveEffectLike",
                mode: "override",
                path: "flags.pf2e.kineticist.elements",
                priority: 10,
                value: [],
            },
            {
                key: "ActiveEffectLike",
                mode: "override",
                path: "flags.pf2e.kineticist.gate",
                priority: 10,
                value: {
                    five: "none",
                    four: "none",
                    one: "none",
                    six: "none",
                    three: "none",
                    two: "none",
                },
            },
        ];

        const impulsesRules = [
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
            },
        ];

        const elementOne = kineticGate.system.rules.find(
            (r): r is ChoiceSetSource => r.key === "ChoiceSet" && "flag" in r && r.flag === "elementOne",
        )?.selection;

        kineticGate.system.rules.push(...kineticGateRules);
        impulses.system.rules = impulsesRules;

        if (typeof(elementOne) == "string") {
            this.#setElement(source, elementOne, "one")
        }

        const elementTwo = kineticGate.system.rules.find(
            (r): r is ChoiceSetSource => r.key === "ChoiceSet" && "flag" in r && r.flag === "elementTwo",
        )?.selection;

        if (typeof(elementTwo) == "string") {
            this.#setElement(source, elementTwo, "two")
        }

        if (gateJunction) {
            gateJunction.system.rules = [];
        }

        const gatesThreshold = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "gates-threshold");

        if (gatesThreshold) {
            const elementThree = gatesThreshold.system.rules.find(
                (r): r is ChoiceSetSource => r.key === "ChoiceSet" && "flag" in r && r.flag === "elementFork",
            )?.selection;

            if (typeof(elementThree) == "string") {
                this.#setElement(source, elementThree, "three")
            }
        }

        const secondThreshold = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "second-gates-threshold");

        if (secondThreshold) {
            const elementFour = secondThreshold.system.rules.find(
                (r): r is ChoiceSetSource => r.key === "ChoiceSet" && "flag" in r && r.flag === "elementFork",
            )?.selection;

            if (typeof(elementFour) == "string") {
                this.#setElement(source, elementFour, "four")
            }
        }

        const thirdThreshold = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "third-gates-threshold");

        if (thirdThreshold) {
            const elementFive = thirdThreshold.system.rules.find(
                (r): r is ChoiceSetSource => r.key === "ChoiceSet" && "flag" in r && r.flag === "elementFork",
            )?.selection;

            if (typeof(elementFive) == "string") {
                this.#setElement(source, elementFive, "five")
            }
        }

        const fourthThreshold = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "fourth-gates-threshold");

        if (fourthThreshold) {
            const elementSix = fourthThreshold.system.rules.find(
                (r): r is ChoiceSetSource => r.key === "ChoiceSet" && "flag" in r && r.flag === "elementFork",
            )?.selection;

            if (typeof(elementSix) == "string") {
                this.#setElement(source, elementSix, "six")
            }
        }
    }

    async #loadFeatSource(uuid: ItemUUID): Promise<FeatSource | null> {
        const item = await fromUuid<ItemPF2e>(uuid);
        const source: ItemSourcePF2e | null = item?.toObject(true) ?? null;
        return source && itemIsOfType(source, "feat") ? source : null;
    }

    #setGate(gate: FeatSource, gateNumber: string, element: string) {
        const modifiedRules = [
            {
                key: "ActiveEffectLike",
                mode: "override",
                path: "flags.pf2e.kineticist.gate." + gateNumber,
                value: element,
            },
        ];

        gate.system.rules.push(...modifiedRules);

        switch (gateNumber) {
            case "three":
                gate.system.level.value = 5;
                break;
            case "four":
                gate.system.level.value = 9;
                break;
            case "five":
                gate.system.level.value = 13;
                break;
            case "six":
                gate.system.level.value = 17;
                break;
        }

        gate.system.rules.slice(0,2)
    }

    async #setElement(source: ActorSourcePF2e, element: string, gateNumber: string) {
        const elementMap: Map<string, ItemUUID> = new Map([
            ["air", "Compendium.pf2e.classfeatures.Item.X11Y3T1IzmtNqGMV"],
            ["earth", "Compendium.pf2e.classfeatures.Item.dEm00L1XFXFCH2wS"],
            ["fire", "Compendium.pf2e.classfeatures.Item.PfeDtJBJdUun0THS"],
            ["metal", "Compendium.pf2e.classfeatures.Item.21JjdNW0RQ2LfaH3"],
            ["water", "Compendium.pf2e.classfeatures.Item.MvunDFH8Karxee0t"],
            ["wood", "Compendium.pf2e.classfeatures.Item.8X8db58vKx21L0Dr"],
        ])

        const elementUUID = elementMap.get(element)

        if (elementUUID) {
            const gate = await this.#loadFeatSource(elementUUID);

            if (gate) {
                this.#setGate(gate, gateNumber, element);
                source.items.push(gate);
            }
        }
    }
}
