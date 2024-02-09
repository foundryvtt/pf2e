import { SimpleAction } from "@actor/actions/index.ts";

const avertGaze = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.AvertGaze.Description",
    effect: "Compendium.pf2e.other-effects.ZXUOdZqUW22OX3ge", // Effect: Avert Gaze
    img: "icons/magic/perception/eye-ringed-glow-angry-small-red.webp",
    name: "PF2E.Actions.AvertGaze.Title",
    section: "specialty-basic",
    slug: "avert-gaze",
});

export { avertGaze };
