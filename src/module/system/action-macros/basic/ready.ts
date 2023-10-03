import { SimpleAction } from "@actor/actions/index.ts";

const ready = new SimpleAction({
    cost: 2,
    description: "PF2E.Actions.Ready.Description",
    name: "PF2E.Actions.Ready.Title",
    slug: "ready",
    traits: ["concentrate"],
});

export { ready };
