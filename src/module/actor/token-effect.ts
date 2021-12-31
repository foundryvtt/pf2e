export class TokenEffect implements TemporaryEffect {
    data: { disabled: boolean; icon: string; tint: string } = {
        disabled: false,
        icon: "",
        tint: "",
    };

    readonly isTemporary = true;

    readonly flags: Record<string, Record<string, string | boolean | undefined>> = {};

    constructor(icon: string, overlay = false, tint?: string | null | undefined) {
        this.data.icon = icon;
        if (tint) {
            this.data.tint = tint;
        }
        this.flags.core = { overlay };
    }

    getFlag(scope: string, flag: string): string | boolean | undefined {
        return this.flags[scope]?.[flag];
    }
}
