import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "SF2E.Actions.Drive";

const drive = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    rollOptions: ["action:drive"],
    section: "skill",
    slug: "drive",
    statistic: "piloting",
    traits: ["move"],
    variants: [
        {
            cost: 1,
            description: `${PREFIX}.Drive1.Description`,
            name: `${PREFIX}.Drive1.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Drive1.Notes.success` },
                { outcome: ["failure"], text: `${PREFIX}.Drive1.Notes.failure` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Drive1.Notes.criticalFailure` },
            ],
            rollOptions: ["action:drive", "action:drive:drive1"],
            slug: "drive1",
        },
        {
            cost: 2,
            description: `${PREFIX}.Drive2.Description`,
            name: `${PREFIX}.Drive2.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Drive2.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Drive2.Notes.failure` },
            ],
            rollOptions: ["action:drive", "action:drive:drive2"],
            slug: "drive2",
            traits: ["move", "reckless"],
        },
        {
            cost: 3,
            description: `${PREFIX}.Drive3.Description`,
            modifiers: [{ label: `${PREFIX}.Drive3.Title`, modifier: -5 }],
            name: `${PREFIX}.Drive3.Title`,
            notes: [
                { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Drive3.Notes.success` },
                { outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Drive3.Notes.failure` },
            ],
            rollOptions: ["action:drive", "action:drive:drive3"],
            slug: "drive3",
            traits: ["move", "reckless"],
        },
    ],
});

export { drive };
