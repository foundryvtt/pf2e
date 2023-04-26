import { SimpleAction } from "@actor/actions/index.ts";

const interact = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Interact.Description",
    name: "PF2E.Actions.Interact.Title",
    slug: "interact",
    traits: ["manipulate"],
});

export { interact };
