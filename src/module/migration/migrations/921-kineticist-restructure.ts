import { FeatSource } from "@item/base/data/index.ts";
import { CreatureSource } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Move existing kineticists to the new class automation structure **/
export class Migration921KineticistRestructure extends MigrationBase {
    static override version = 0.921;

    override async updateActor(source: CreatureSource): Promise<void> {
        if (source.type === "character" && source.items.some((i) => i.slug === "kinetic-gate")) {
            const airUUID = "Compendium.pf2e.classfeatures.Item.X11Y3T1IzmtNqGMV";
            // const earthUUID = "Compendium.pf2e.classfeatures.Item.dEm00L1XFXFCH2wS"
            // const fireUUID = "Compendium.pf2e.classfeatures.Item.PfeDtJBJdUun0THS"
            // const metalUUID = "Compendium.pf2e.classfeatures.Item.21JjdNW0RQ2LfaH3"
            // const waterUUID = "Compendium.pf2e.classfeatures.Item.MvunDFH8Karxee0t"
            // const woodUUID = "Compendium.pf2e.classfeatures.Item.8X8db58vKx21L0Dr"

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

            const kineticGate = source.items.filter((i) => i.slug === "kinetic-gate")[0];
            const elementOne = kineticGate.system.rules.filter((r) => r.flag === "elementOne")[0].selection;
            const impulses = source.items.filter((i) => i.slug === "impulses")[0];

            kineticGate.system.rules.push(kineticGateRules);
            impulses.system.rules = impulsesRules;

            switch (elementOne) {
                case "air":
                    const airGateSource = await fromUuid(airUUID);
                    const airGate = airGateSource?.toObject;
                    this.setGate(airGate, "one", "air");
                    source.createEmbeddedDocuments("Item", [airGate]);
                    break;
                case "earth":
                    const earthGateSource = await fromUuid(airUUID);
                    const earthGate = earthGateSource?.toObject;
                    this.setGate(earthGate, "one", "earth");
                    source.createEmbeddedDocuments("Item", [earthGate]);
                    break;
                case "fire":
                    const fireGateSource = await fromUuid(airUUID);
                    const fireGate = fireGateSource?.toObject;
                    this.setGate(fireGate, "one", "fire");
                    source.createEmbeddedDocuments("Item", [fireGate]);
                    break;
                case "metal":
                    const metalGateSource = await fromUuid(airUUID);
                    const metalGate = metalGateSource?.toObject;
                    this.setGate(metalGate, "one", "metal");
                    source.createEmbeddedDocuments("Item", [metalGate]);
                    break;
                case "water":
                    const waterGateSource = await fromUuid(airUUID);
                    const waterGate = waterGateSource?.toObject;
                    this.setGate(waterGate, "one", "water");
                    source.createEmbeddedDocuments("Item", [waterGate]);
                    break;
                case "wood":
                    const woodGateSource = await fromUuid(airUUID);
                    const woodGate = woodGateSource?.toObject;
                    this.setGate(woodGate, "one", "wood");
                    source.createEmbeddedDocuments("Item", [woodGate]);
                    break;
            }

            const gateJunction = source.items.filter((i) => i.slug === "gates-junction")[0];

            if (gateJunction) {
                gateJunction.system.rules = [];
            }
        }
    }

    setGate(gate: FeatSource, gateNumber: string, element: string) {
        const modifiedRules = [
            {
                key: "ActiveEffectLike",
                mode: "override",
                path: "flags.pf2e.kineticist.gate." + gateNumber,
                value: element,
            },
        ];

        gate.system.rules.push(modifiedRules);

        switch (gate) {
            case "three":
                gate.level = 5
                break;
            case "four":
                gate.level = 9
                break;
            case "five":
                gate.level = 13
                break;
            case "six":
                gate.level = 17
                break;
        }
    }
}
