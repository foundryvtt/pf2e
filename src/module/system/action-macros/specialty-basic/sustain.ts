import { SimpleAction } from "@actor/actions/index.ts";

const sustain = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Sustain.Description",
    name: "PF2E.Actions.Sustain.Title",
    section: "specialty-basic",
    slug: "sustain",
    traits: ["concentrate"],
});

export { sustain };
