import { SimpleAction } from "@actor/actions/index.ts";

const step = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Step.Description",
    name: "PF2E.Actions.Step.Title",
    slug: "step",
    traits: ["move"],
});

export { step };
