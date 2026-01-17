/**
 * @File   : index.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 5/17/2021, 2:51:02 PM
 */

export interface BuildInfo {
    interface: string;
    wowVersion: string;
}

export enum BuildId {
    Unknown = 0,
    Single,
    Vanilla,
    TBC,
    Wrath,
    // Cata,
    Mists,
    Mainline,
}

export interface Env {
    buildId: BuildId;
    version: string;
    debug: boolean;
    builds: BuildId[];
    resFilters: string[];
    single: boolean;
    buildInfos: Map<BuildId, BuildInfo>;
}

interface BuildIdData {
    path: string;
    suffix: string;
    atlas: string[];
    product: string;
    version_prefix?: string;
}

const BUILD_DATA = {
    Vanilla: {
        path: '_classic_era_',
        suffix: 'Vanilla',
        atlas: ['classic', 'vanilla', 'Classic', 'Vanilla'],
        product: 'wow_classic_era',
    },
    TBC: {
        path: '_anniversary_',
        suffix: 'TBC',
        atlas: ['bcc', 'BCC', 'anniversary', 'tbc', 'TBC'],
        product: 'wow_anniversary',
    },
    Wrath: {
        path: '_classic_titan_',
        suffix: 'Wrath',
        atlas: ['lkc', 'wrath', 'WOTLKC', 'Wrath', 'wlk'],
        product: 'wow_classic_titan',
        // version_prefix: '3.',
    },
    // Cata: {
    //     path: '_classic_',
    //     suffix: 'Cata',
    //     atlas: ['cata', 'ctm'],
    //     product: 'wow_classic',
    //     version_prefix: '4.',
    // },
    Mists: {
        path: '_classic_',
        suffix: 'Mists',
        atlas: ['mop', 'mists'],
        product: 'wow_classic',
        // version_prefix: '5.'
    },
    Mainline: {
        path: '_retail_',
        suffix: 'Mainline',
        atlas: ['retail', 'Retail', 'Mainline'],
        product: 'wow',
    },
};

class EnvManager {
    private _env: Env;
    private _conditions?: Map<string, boolean>;
    private _invalid = new Map<string, boolean>();
    private _buildData: Map<BuildId, BuildIdData> = new Map(
        Object.entries(BUILD_DATA).map(([k, v]) => [BuildId[k as keyof typeof BuildId], v])
    );

    get env() {
        return this._env;
    }

    get buildData() {
        return this._buildData;
    }

    setEnv(env: Env) {
        this._env = env;
        this._conditions = new Map<string, boolean>([
            ['debug', env.debug],
            ['release', !env.debug],
            ['import', true],
        ]);

        for (const buildId of env.builds) {
            const flag = buildId === env.buildId;

            if (env.single) {
                this._invalid.set(BuildId[buildId], true);
            } else {
                this._conditions.set(BuildId[buildId], flag);
            }

            const data = this._buildData.get(buildId);
            if (data) {
                for (const a of data.atlas) {
                    if (env.single) {
                        this._invalid.set(a, true);
                    } else {
                        this._conditions.set(a, flag);
                    }
                }
            }
        }
    }

    getBuildData(buildId: BuildId) {
        return this._buildData.get(buildId);
    }

    toBuildId(key: string) {
        const e = BuildId[key as keyof typeof BuildId];
        if (e && this._buildData?.has(e)) {
            return e;
        }

        for (const [k, v] of this._buildData?.entries()) {
            if (v.atlas?.includes(key)) {
                return k;
            }
        }
        return BuildId.Unknown;
    }

    getBuildSuffix(buildId: BuildId) {
        return this._buildData.get(buildId)?.suffix;
    }

    getBuildDirName(buildId: BuildId) {
        return this._buildData.get(buildId)?.path as string;
    }

    checkCondition(condition: string) {
        if (this._invalid.has(condition)) {
            console.warn(`Condition ${condition} in single mode is invalid.`);
            return true;
        }
        return this._conditions?.has(condition) && this._conditions.get(condition);
    }

    checkBuild(op: string, v: string) {
        if (this.env.single) {
            console.warn(`Condition ${op}${v} in single mode is invalid.`);
            return true;
        }
        let ver = Number.parseInt(v);
        if (!ver) {
            throw Error(`unknown version: ${v}`);
        }

        if (ver < 10000) {
            ver *= 10000;
        }

        const version = Number.parseInt(this._env.buildInfos.get(this._env.buildId)!.interface);

        switch (op) {
            case '>':
                return version > ver;
            case '>=':
                return version >= ver;
            case '<':
                return version < ver;
            case '<=':
                return version <= ver;
            case '=':
            case '==':
                return version === ver;
            case '!=':
            case '~=':
                return version !== ver;
            case '^':
                return Math.abs(version - ver) < 10000;
            default:
                throw Error(`unknown op: ${op}`);
        }
    }
}

export const gEnv = new EnvManager();
