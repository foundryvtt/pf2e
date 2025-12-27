import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.PlotCourse";

const plotCourse = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["action:plot-course"],
    section: "skill",
    slug: "plot-course",
    statistic: "piloting",
    traits: ["exploration", "secret"],
});

export { plotCourse };
