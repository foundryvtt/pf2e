import { SimpleAction } from "@actor/actions/index.ts";

const pointOut = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.PointOut.Description",
    name: "PF2E.Actions.PointOut.Title",
    section: "specialty-basic",
    slug: "point-out",
    traits: ["auditory", "manipulate", "visual"],
});

export { pointOut };
