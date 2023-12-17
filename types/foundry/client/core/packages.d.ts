import type * as packages from "../../common/packages/module.d.ts";

/**
 * @ignore
 */
export class ClientBaseModule extends packages.BaseModule {
    /**
     * Is this package marked as a favorite?
     * This boolean is currently only populated as true in the /setup view of the software.
     */
    favorite: boolean;

    /** Associate package availability with certain badge for client-side display. */
    getVersionBadge(): PackageCompatibilityBadge | null;

    /**
     * Determine a version badge for the provided compatibility data.
     * @param availability The availability level.
     * @param data         The compatibility data.
     */
    static getVersionBadge(
        availability: PackageAvailabilityCode,
        data: Partial<packages.PackageManifestData>,
    ): PackageCompatibilityBadge | null;

    /**
     * List missing dependencies and format them for display.
     * @param availability The availability value.
     * @param data         The compatibility data.
     * @param deps         The dependencies to format.
     */
    protected static _formatBadDependenciesTooltip(
        availability: PackageAvailabilityCode,
        data: Partial<packages.PackageManifestData>,
        deps: Iterable<packages.RelatedPackage>,
    ): string;

    /** When a package has been installed, add it to the local game data. */
    install(): void;

    /** When a package has been uninstalled, remove it from the local game data. */
    uninstall(): void;

    /**
     * Remove a package from the local game data when it has been uninstalled.
     * @param id The package ID.
     */
    static uninstall(id: string): void;

    /**
     * Retrieve the latest Package manifest from a provided remote location.
     * @param manifest A remote manifest URL to load
     * @param options  Additional options which affect package construction
     * @param [options.strict=true]   Whether to construct the remote package strictly
     * @returns A Promise which resolves to a constructed ServerPackage instance
     * @throws An error if the retrieved manifest data is invalid
     */
    static fromRemoteManifest<T extends packages.BasePackage<packages.BasePackageSchema>>(
        this: ConstructorOf<T>,
        manifest: string,
        options?: { strict?: boolean },
    ): Promise<T | null>;
}

/**
 * @ignore
 */
export class ClientBaseSystem extends packages.BaseSystem {
    /**
     * Is this package marked as a favorite?
     * This boolean is currently only populated as true in the /setup view of the software.
     */
    favorite: boolean;

    /** Associate package availability with certain badge for client-side display. */
    getVersionBadge(): PackageCompatibilityBadge | null;

    /**
     * Determine a version badge for the provided compatibility data.
     * @param availability The availability level.
     * @param data         The compatibility data.
     */
    static getVersionBadge(
        availability: PackageAvailabilityCode,
        data: Partial<packages.PackageManifestData>,
    ): PackageCompatibilityBadge | null;

    /**
     * List missing dependencies and format them for display.
     * @param availability The availability value.
     * @param data         The compatibility data.
     * @param deps         The dependencies to format.
     */
    protected static _formatBadDependenciesTooltip(
        availability: PackageAvailabilityCode,
        data: Partial<packages.PackageManifestData>,
        deps: Iterable<packages.RelatedPackage>,
    ): string;

    /** When a package has been installed, add it to the local game data. */
    install(): void;

    /** When a package has been uninstalled, remove it from the local game data. */
    uninstall(): void;

    /**
     * Remove a package from the local game data when it has been uninstalled.
     * @param id The package ID.
     */
    static uninstall(id: string): void;

    /**
     * Retrieve the latest Package manifest from a provided remote location.
     * @param manifest A remote manifest URL to load
     * @param options  Additional options which affect package construction
     * @param [options.strict=true]   Whether to construct the remote package strictly
     * @returns A Promise which resolves to a constructed ServerPackage instance
     * @throws An error if the retrieved manifest data is invalid
     */
    static fromRemoteManifest<T extends packages.BasePackage<packages.BasePackageSchema>>(
        this: ConstructorOf<T>,
        manifest: string,
        options?: { strict?: boolean },
    ): Promise<T | null>;
}

/**
 * @ignore
 */
export class ClientBaseWorld extends packages.BaseWorld {
    /**
     * Is this package marked as a favorite?
     * This boolean is currently only populated as true in the /setup view of the software.
     */
    favorite: boolean;

    /** Associate package availability with certain badge for client-side display. */
    getVersionBadge(): PackageCompatibilityBadge | null;

    /**
     * Determine a version badge for the provided compatibility data.
     * @param availability The availability level.
     * @param data         The compatibility data.
     */
    static getVersionBadge(
        availability: PackageAvailabilityCode,
        data: Partial<packages.PackageManifestData>,
    ): PackageCompatibilityBadge | null;

    /**
     * List missing dependencies and format them for display.
     * @param availability The availability value.
     * @param data         The compatibility data.
     * @param deps         The dependencies to format.
     */
    protected static _formatBadDependenciesTooltip(
        availability: PackageAvailabilityCode,
        data: Partial<packages.PackageManifestData>,
        deps: Iterable<packages.RelatedPackage>,
    ): string;

    /** When a package has been installed, add it to the local game data. */
    install(): void;

    /** When a package has been uninstalled, remove it from the local game data. */
    uninstall(): void;

    /**
     * Remove a package from the local game data when it has been uninstalled.
     * @param id The package ID.
     */
    static uninstall(id: string): void;

    /**
     * Retrieve the latest Package manifest from a provided remote location.
     * @param manifest A remote manifest URL to load
     * @param options  Additional options which affect package construction
     * @param [options.strict=true]   Whether to construct the remote package strictly
     * @returns A Promise which resolves to a constructed ServerPackage instance
     * @throws An error if the retrieved manifest data is invalid
     */
    static fromRemoteManifest<T extends packages.BasePackage<packages.BasePackageSchema>>(
        this: ConstructorOf<T>,
        manifest: string,
        options?: { strict?: boolean },
    ): Promise<T | null>;
}

interface PackageCompatibilityBadge {
    /** A type in "safe", "unsafe", "warning", "neutral" applied as a CSS class */
    type: "safe" | "unsafe" | "warning" | "neutral";
    /** A tooltip string displayed when hovering over the badge */
    tooltip: string;
    /** An optional text label displayed in the badge */
    label?: string;
    /** An optional icon displayed in the badge */
    icon?: string;
}

declare global {
    /**
     * @category Packages
     */
    class Module extends ClientBaseModule {
        readonly active: boolean;

        constructor(
            data: SourceFromSchema<packages.BaseModule["schema"]["fields"]>,
            options?: DataModelConstructionOptions<null>,
        );
    }

    /**
     * @category Packages
     */
    class System extends ClientBaseSystem {}

    /**
     * @category  Packages
     */
    class World extends ClientBaseWorld {
        static override getVersionBadge(
            availability: PackageAvailabilityCode,
            data: Partial<packages.PackageManifestData>,
        ): PackageCompatibilityBadge | null;

        /** Provide data for a system badge displayed for the world which reflects the system ID and its availability */
        getSystemBadge(): PackageCompatibilityBadge | null;

        protected static override _formatBadDependenciesTooltip(
            availability: PackageAvailabilityCode,
            data: Partial<packages.PackageManifestData>,
            deps: Iterable<packages.RelatedPackage>,
        ): string;
    }

    /** A mapping of allowed package types and the classes which implement them. */
    const PACKAGE_TYPES: {
        world: World;
        system: System;
        module: Module;
    };
}
