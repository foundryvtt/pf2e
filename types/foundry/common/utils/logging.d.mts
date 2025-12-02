import { CompatibilityMode } from "@common/constants.mjs";

/**
 * Log a compatibility warning which is filtered based on the client's defined compatibility settings.
 * @param message The original warning or error message
 * @param options Additional options which customize logging
 * @param options.mode A logging level in COMPATIBILITY_MODES which overrides the configured default
 * @param options.since A version identifier since which a change was made
 * @param options.until A version identifier until which a change remains supported
 * @param options.details Additional details to append to the logged message
 * @param options.stack Include the message stack trace
 * @param options.once Log this the message only once?
 * @throws An Error if the mode is ERROR
 */
export function logCompatibilityWarning(
    message: string,
    options?: {
        mode?: CompatibilityMode;
        since?: number | string;
        until?: number | string;
        details?: string;
        stack?: boolean;
        once?: boolean;
    },
): void;
