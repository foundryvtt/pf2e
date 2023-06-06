export class TokenEffect implements TemporaryEffect {
    disabled: boolean;

    icon: ImageFilePath;

    tint?: string;

    statuses = new Set<string>();

    readonly isTemporary = true;

    readonly flags: Record<string, Record<string, string | boolean | undefined>> = {};

    constructor(icon: ImageFilePath, overlay = false, tint?: string | null | undefined) {
        this.icon = icon;
        this.disabled = false;
        if (tint) {
            this.tint = tint;
        }
        this.flags.core = { overlay };
    }

    getFlag(scope: string, flag: string): string | boolean | undefined {
        return this.flags[scope]?.[flag];
    }
}
