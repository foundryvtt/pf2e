import { SimpleAction } from "@actor/actions/index.ts";

const PREFIX = "SF2E.Actions.Stop";

const stop = new SimpleAction({
    cost: 1,
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    section: "skill",
    slug: "stop",
    traits: ["manipulate"],
});

export { stop };
