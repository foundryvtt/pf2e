import { SimpleAction } from "@actor/actions/index.ts";

const dismiss = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Dismiss.Description",
    name: "PF2E.Actions.Dismiss.Title",
    section: "specialty-basic",
    slug: "dismiss",
    traits: ["concentrate"],
});

export { dismiss };
