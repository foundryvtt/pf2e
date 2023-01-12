import { MigrationBase } from "./base";
import { MigrationRunner } from "./runner";
import * as Migrations from "./migrations";
export { MigrationRunner } from "./runner";

export class MigrationList {
    private static list = Object.values(Migrations);

    static get latestVersion(): number {
        return Math.max(...this.list.map((M) => M.version));
    }

    static constructAll(): MigrationBase[] {
        return this.list.map((M) => new M());
    }

    static constructFromVersion(version: number | null): MigrationBase[] {
        const minVersion = Number(version) || MigrationRunner.RECOMMENDED_SAFE_VERSION;
        return this.list.filter((M) => M.version > minVersion).map((M) => new M());
    }

    static constructRange(min: number, max = Infinity): MigrationBase[] {
        return this.list.filter((M) => M.version >= min && M.version <= max).map((M) => new M());
    }
}
