import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.GrabAnEdge";

const grabAnEdge = new SingleCheckAction({
    cost: "reaction",
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    section: "specialty-basic",
    slug: "grab-an-edge",
    statistic: ["reflex", "acrobatics"],
    traits: ["manipulate"],
});

export { grabAnEdge };
