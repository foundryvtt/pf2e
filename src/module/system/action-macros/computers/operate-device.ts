import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.OperateDevice";

const operateDevice = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["action:operate-device"],
    section: "skill",
    slug: "operate-device",
    statistic: "computers",
    traits: ["concentrate", "exploration"],
});

export { operateDevice };
