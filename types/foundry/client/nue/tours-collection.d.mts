import Collection from "@common/utils/collection.mjs";
import Tour from "./tour.mjs";

/**
 * A singleton Tour Collection class responsible for registering and activating Tours, accessible as game.tours.
 * @see {@link foundry.Game#tours}
 */
export default class ToursCollection extends Collection<string, Tour> {
    constructor();

    /**
     * Register a new Tour.
     * @param namespace The namespace of the Tour
     * @param id The machine-readable id of the Tour
     * @param tour The constructed Tour
     */
    register(namespace: string, id: string, tour: Tour): void;

    /**
     * Set a Tour to the collection.
     */
    override set(key: string, tour: Tour): this;
}
