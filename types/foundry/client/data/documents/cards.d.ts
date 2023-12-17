import type { ClientBaseCards } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side Cards document which extends the common BaseCards model.
     * Each Cards document contains CardsData which defines its data schema.
     *
     * @see {@link CardStacks}  The world-level collection of Cards documents
     * @see {@link CardsConfig} The Cards configuration application
     * @todo Fill in
     */
    class Cards extends ClientBaseCards {
        /** Provide a thumbnail image path used to represent this document. */
        get thumbnail(): this["img"];

        /** The Card documents within this stack which are available to be drawn. */
        get availableCards(): Card<this>[];

        /** The Card documents which belong to this stack but have already been drawn. */
        get drawnCards(): Card<this>[];

        /** Returns the localized Label for the type of Card Stack this is */
        get typeLabel(): string;

        /** Can this Cards document be cloned in a duplicate workflow? */
        get canClone(): boolean;
    }
}
