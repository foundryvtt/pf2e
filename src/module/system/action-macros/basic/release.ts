import { SimpleAction } from "@actor/actions/index.ts";

const release = new SimpleAction({
    cost: "free",
    description: "PF2E.Actions.Release.Description",
    name: "PF2E.Actions.Release.Title",
    slug: "release",
    traits: ["manipulate"],
});

export { release };
