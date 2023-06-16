/**
 * Quick and dirty API around the Loading bar.
 * Does not handle conflicts; multiple instances of this class will fight for the same loading bar, but once all but
 * once are completed, the bar should return to normal
 *
 * @category Other
 */
class Progress {
    value = 0;
    readonly max: number;
    /** An initial label: overridable while advancing */
    label: string;

    constructor({ max, label }: { max: number; label?: string }) {
        this.label = label ?? "";
        this.max = max;
    }

    advance({ by = 1, label = this.label }: { by?: number; label?: string } = {}): void {
        if (this.value === this.max) return;
        this.value += Math.abs(by);
        const pct = Math.floor((this.value / this.max) * 100);
        SceneNavigation.displayProgressBar({ label, pct });
    }

    close({ label = "" } = {}): void {
        SceneNavigation.displayProgressBar({ label, pct: 100 });
    }
}

export { Progress };
