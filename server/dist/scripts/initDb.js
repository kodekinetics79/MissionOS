"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const dbPath = (0, node_path_1.join)(process.cwd(), 'data', 'missionos.sqlite');
if ((0, node_fs_1.existsSync)(dbPath)) {
    (0, node_fs_1.rmSync)(dbPath);
}
require('../utils/prisma.js');
console.log('MissionOS SQLite database is ready at data/missionos.sqlite');
