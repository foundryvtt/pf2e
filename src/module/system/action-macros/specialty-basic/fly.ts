import { SimpleAction } from "@actor/actions/index.ts";

const fly = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Fly.Description",
    name: "PF2E.Actions.Fly.Title",
    section: "specialty-basic",
    slug: "fly",
    traits: ["move"],
});

export { fly };
