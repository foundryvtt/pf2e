import { CreatureSource } from "@actor/data/index.ts";
import { ItemPF2e } from "@item";
import { FeatSource, ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { ChoiceSetSource } from "@module/rules/rule-element/choice-set/data.ts";
import { sluggify } from "@util/misc.ts";
import { MigrationBase } from "../base.ts";

/** Move existing kineticists to the new class automation structure **/
export class Migration921KineticistRestructure extends MigrationBase {
    static override version = 0.921;

    override async updateActor(source: CreatureSource): Promise<void> {
        if (source.type !== "character") return;

        const kineticGate = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "kinetic-gate");
        const impulses = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "impulses");
        const gateJunction = source.items.find((i) => (i.system.slug ?? sluggify(i.name)) === "gates-junction");
        if (!kineticGate || !impulses || !gateJunction) return;

        const airUUID = "Compendium.pf2e.classfeatures.Item.X11Y3T1IzmtNqGMV";
        const earthUUID = "Compendium.pf2e.classfeatures.Item.dEm00L1XFXFCH2wS";
        const fireUUID = "Compendium.pf2e.classfeatures.Item.PfeDtJBJdUun0THS";
        const metalUUID = "Compendium.pf2e.classfeatures.Item.21JjdNW0RQ2LfaH3";
        const waterUUID = "Compendium.pf2e.classfeatures.Item.MvunDFH8Karxee0t";
        const woodUUID = "Compendium.pf2e.classfeatures.Item.8X8db58vKx21L0Dr";

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

        switch (elementOne) {
            case "air": {
                const airGate = await this.#loadFeatSource(airUUID);
                if (airGate) {
                    this.#setGate(airGate, "one", "air");
                    source.createEmbeddedDocuments("Item", [airGate]);
                }
                break;
            }
            case "earth": {
                const earthGate = await this.#loadFeatSource(earthUUID);
                if (earthGate) {
                    this.#setGate(earthGate, "one", "earth");
                    source.createEmbeddedDocuments("Item", [earthGate]);
                }
                break;
            }
            case "fire": {
                const fireGate = await this.#loadFeatSource(fireUUID);
                if (fireGate) {
                    this.#setGate(fireGate, "one", "fire");
                    source.createEmbeddedDocuments("Item", [fireGate]);
                }
                break;
            }
            case "metal": {
                const metalGate = await this.#loadFeatSource(metalUUID);
                if (metalGate) {
                    this.#setGate(metalGate, "one", "metal");
                    source.createEmbeddedDocuments("Item", [metalGate]);
                }
                break;
            }
            case "water": {
                const waterGate = await this.#loadFeatSource(waterUUID);
                if (waterGate) {
                    this.#setGate(waterGate, "one", "water");
                    source.createEmbeddedDocuments("Item", [waterGate]);
                }
                break;
            }
            case "wood": {
                const woodGate = await this.#loadFeatSource(woodUUID);
                if (woodGate) {
                    this.#setGate(woodGate, "one", "wood");
                    source.createEmbeddedDocuments("Item", [woodGate]);
                }
                break;
            }
        }

        if (gateJunction) {
            gateJunction.system.rules = [];
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
    }
}
