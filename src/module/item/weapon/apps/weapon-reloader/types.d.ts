import { SvelteComponent } from "svelte";

declare global {
    // Allows the import of any svelte file as a component.
    // Necessary to import svgs as components (such as heavy-bullets.svelte)
    // todo: consider moving to a more global location
    declare module "*.svelte" {
        export default SvelteComponent;
    }
}
