import { SimpleAction } from "@actor/actions";

const dropProne = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.DropProne.Description",
    name: "PF2E.Actions.DropProne.Title",
    slug: "drop-prone",
    traits: ["move"],
});

export { dropProne };
