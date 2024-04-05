import { SimpleAction } from "@actor/actions/index.ts";

const mount = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Mount.Description",
    name: "PF2E.Actions.Mount.Title",
    section: "specialty-basic",
    slug: "mount",
    traits: ["move"],
});

export { mount };
