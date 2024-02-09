import { SimpleAction } from "@actor/actions/index.ts";

const crawl = new SimpleAction({
    cost: 1,
    description: "PF2E.Actions.Crawl.Description",
    name: "PF2E.Actions.Crawl.Title",
    section: "basic",
    slug: "crawl",
    traits: ["move"],
});

export { crawl };
