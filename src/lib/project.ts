/**
 * @File   : project.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 10/28/2019, 5:28:51 PM
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'fast-glob';
import { BuildId, BuildInfo, Env, gEnv } from './env';
import { findFiles } from './files';
import { readChangeLog, readFile } from './util';
import { toWowVersion } from './util';

interface Addon {
    name: string;
    folder: string;
}

interface BuildMap {
    [key: string]: BuildInfo | string;
}

interface WowPackage {
    name: string;
    // eslint-disable-next-line camelcase
    curse_id?: number;
    // eslint-disable-next-line camelcase
    old_version_style: boolean;
    changelog?: string;
    builds?: BuildMap;
    // eslint-disable-next-line camelcase
    res_filters?: string[];
    'res-filters'?: string[];
    'no-compiles'?: string[];
    'scan-locale-ignores'?: string[];

    addons?: { [name: string]: string };
    nga_id?: { [name: string]: number };
}

export class Project implements Addon {
    private _name: string;
    private _version: string;
    private _curseId: number;
    private _folder: string;
    private _changelog?: string;
    private _addons: Addon[] = [];
    private _buildEnvs = new Map<BuildId, Env>();
    private _resFilters: string[] = [];
    private _localeIgnores: string[] = [];
    private _noCompiles = new Set<string>;
    private _ngaId = new Map<BuildId, number>();

    constructor(readonly debug = false) { }

    get name() {
        return this._name;
    }

    get folder() {
        return this._folder;
    }

    get version() {
        return this._version;
    }

    get curseId() {
        return this._curseId;
    }

    get changelog() {
        return this._changelog;
    }

    get addons() {
        return this._addons;
    }

    get buildEnvs() {
        return this._buildEnvs;
    }

    get localeIgnores() {
        return this._localeIgnores;
    }

    getNgaId(buildId: BuildId) {
        return this._ngaId.get(buildId);
    }

    genFileName(buildId?: BuildId) {
        if (buildId) {
            const suffix = gEnv.getBuildSuffix(buildId);
            if (suffix && suffix.length > 0) {
                return `${this.name}-${suffix}-${this.version}.zip`;
            }
        }
        return `${this.name}-${this.version}.zip`;
    }

    private parseOldVersionStyle(version: string) {
        const m = version.match(/(\d+)\.(\d+)\.(\d+)-?(\d*)/);
        if (!m) {
            throw Error('version error');
        }

        const major = Number.parseInt(m[1]);
        const minor = Number.parseInt(m[2]);
        const patch = Number.parseInt(m[3]);
        const prerelease = Number.parseInt(m[4]);

        version = `${major * 10000 + minor}.${patch.toString().padStart(2, '0')}`;

        if (prerelease >= 0) {
            version = `${version}-${prerelease}`;
        }
        return version;
    }

    async fetchRemoteFiles() {
        return await findFiles(this._folder, this._name, true);
    }

    async findFiles() {
        return await findFiles(this._folder, this._name);
    }

    getSubAddons() {
        return this.addons.filter(addon => !(addon instanceof Project));
    }

    async allFiles() {
        return (await Promise.all(this.addons.map((addon) => {
            if (addon instanceof Project) {
                return findFiles(addon.folder, addon.name, false, this.getSubAddons().map((addon) => addon.folder));
            }
            return findFiles(addon.folder, addon.name);
        }))).flat();
    }

    allFolders() {
        return this.addons.map((addon) => addon.folder);
    }

    isNoCompile(file: string) {
        return this._noCompiles.has(file);
    }

    async init() {
        const pkg = await fs.readJson('./package.json');

        if (!pkg.wow || !pkg.wow.name) {
            throw Error('not a wow curse project');
        }

        const p: WowPackage = pkg.wow;

        this._folder = path.resolve('./');
        this._name = p.name;
        this._curseId = p.curse_id || 0;

        if (!p.old_version_style) {
            this._version = pkg.version;
        } else {
            this._version = this.parseOldVersionStyle(pkg.version);
        }

        if (p['res-filters']) {
            this._resFilters = p['res-filters'];
        } else if (p.res_filters) {
            this._resFilters = p.res_filters;
        }

        if (p.nga_id) {
            for (const [buildKey, tid] of Object.entries(p.nga_id)) {
                const buildId = gEnv.toBuildId(buildKey);
                if (buildId) {
                    this._ngaId.set(buildId, tid);
                }
            }
        }

        if (p.builds) {
            const builds = Object.keys(p.builds)
                .map((x) => gEnv.toBuildId(x))
                .filter((x) => x);

            for (const [buildKey, info] of Object.entries(p.builds)) {
                const buildId = gEnv.toBuildId(buildKey);
                if (buildId) {
                    const buildInfo = typeof info === 'string' ? { interface: info } : info;

                    this._buildEnvs.set(buildId, {
                        buildId,
                        buildInfo,
                        builds,
                        version: this._version,
                        debug: this.debug,
                        wowVersion: toWowVersion(buildInfo.interface),
                        resFilters: this._resFilters,
                    });
                }
            }
        }

        if (this._buildEnvs.size === 0) {
            const toc = await readFile(`./${pkg.wow.name}.toc`);
            const m = toc.match(/##\s*Interface\s*:\s*(\d+)/);
            if (m) {
                this._buildEnvs.set(BuildId.Unknown, {
                    buildId: BuildId.Unknown,
                    buildInfo: { interface: m[1] },
                    version: this._version,
                    debug: this.debug,
                    wowVersion: toWowVersion(m[1]),
                    builds: [],
                    resFilters: this._resFilters,
                });
            }
        }

        this._addons.push(this);

        if (p.addons) {
            for (const [name, folder] of Object.entries(p.addons)) {
                this._addons.push({
                    name,
                    folder: path.join(this._folder, folder),
                });
            }
        }

        if (p.changelog) {
            this._changelog = await readChangeLog(p.changelog, this._version);
        }

        if (p['scan-locale-ignores']) {
            this._localeIgnores = p['scan-locale-ignores'];
        } else if (pkg.wow.localization && pkg.wow.localization.ignores) {
            this._localeIgnores = pkg.wow.localization.ignores
        }

        if (p['no-compiles']) {
            this._noCompiles = new Set(p['no-compiles'].map((p) => glob.sync(p)).flat().map(x => path.resolve(x)));
        }
    }
}
