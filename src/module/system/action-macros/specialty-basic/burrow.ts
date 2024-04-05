import { SimpleAction } from "@actor/actions/index.ts";

const burrow = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Burrow.Description",
    name: "PF2E.Actions.Burrow.Title",
    section: "specialty-basic",
    slug: "burrow",
    traits: ["move"],
});

export { burrow };
