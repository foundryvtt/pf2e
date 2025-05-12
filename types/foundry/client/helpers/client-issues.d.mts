import { Setting, WorldDocument } from "@client/documents/_module.mjs";
import WorldCollection from "@client/documents/abstract/world-collection.mjs";
import Module from "@client/packages/module.mjs";
import Document from "@common/abstract/document.mjs";
import { DataModelValidationError } from "@common/data/validation-failure.mjs";

/**
 * An object structure of document types at the top level, with a count of different sub-types for that document type.
 */
type ModuleSubTypeCounts = Record<string, Record<string, number>>;

interface PackageCompatibilityIssue {
    /** Error messages. */
    error: string[];
    /** Warning messages. */
    warning: string[];
}

interface UsabilityIssue {
    /** The pre-localized message to display in relation to the usability issue. */
    message: string;
    /** The severity of the issue, either "error", "warning", or "info". */
    severity: string;
    /** Parameters to supply to the localization. */
    params?: object;
}

/**
 * A class responsible for tracking issues in the current world.
 */
export default class ClientIssues {
    /**
     * Detect and display warnings for known performance issues which may occur due to the user's hardware or browser
     * configuration.
     * @internal
     */
    _detectWebGLIssues(): void;

    /**
     * Add an invalid Document to the module-provided sub-type counts.
     * @param cls The Document class.
     * @param source The Document's source data.
     * @param options.decrement Decrement the counter rather than incrementing it.
     * @internal
     */
    _countDocumentSubType(cls: typeof Document, source: object, options?: { decrement?: boolean }): void;

    /**
     * Track a validation failure that occurred in a WorldCollection.
     * @param collection The parent collection.
     * @param source The Document's source data.
     * @param error  The validation error.
     * @internal
     */
    _trackValidationFailure(
        collection: WorldCollection<WorldDocument | Setting>,
        source: object,
        error: DataModelValidationError,
    ): void;

    /**
     * Detect and record certain usability error messages which are likely to result in the user having a bad experience.
     * @internal
     */
    _detectUsabilityIssues(): void;

    /**
     * Get the Document sub-type counts for a given module.
     * @param module The module or its ID.
     */
    getSubTypeCountsFor(module: Module | string): ModuleSubTypeCounts;

    /**
     * Retrieve all sub-type counts in the world.
     */
    getAllSubTypeCounts(): Iterator<string, ModuleSubTypeCounts>;

    /**
     * Retrieve the tracked validation failures.
     */
    get validationFailures(): object;

    /**
     * Retrieve the tracked usability issues.
     */
    get usabilityIssues(): Record<string, UsabilityIssue>;

    /**
     * Retrieve package compatibility issues.
     */
    get packageCompatibilityIssues(): Record<string, PackageCompatibilityIssue>;
}

export {};
