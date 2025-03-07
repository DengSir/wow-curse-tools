/**
 * @File   : nga.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 3/7/2025, 11:30:01 AM
 */

import * as fs from 'fs-extra';
import { Project } from "../lib/project";
import { Flusher } from '../lib/flusher';
import { Nga } from '../lib/nga';

export interface NgaOptions {
    cookie: string;
    builds?: number[];
}

export class NgaPublish {
    async run(opts: NgaOptions) {
        const project = new Project();
        await project.init();

        for (const [buildId] of project.buildEnvs) {
            if (opts.builds && !opts.builds.includes(buildId)) {
                continue;
            }

            const ngaId = project.getNgaId(buildId);
            if (!ngaId) {
                continue;
            }

            const fileName = project.genFileName(buildId);
            if (!await fs.exists(fileName)) {
                console.log(`Creating package ${fileName} ...`);
                const flusher = new Flusher(project, buildId);
                await flusher.flush(fileName);
            }

            const cli = new Nga(ngaId, opts.cookie);
            await cli.run(fileName, project.version);
        }
    }
}
