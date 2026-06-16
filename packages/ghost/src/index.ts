import * as compareApi from "./compare.js";
import { compare as compareFunction } from "./core/index.js";

/** @deprecated Use `govern`, `compare`, `@anarchitecture/ghost/govern`, or `@anarchitecture/ghost/compare`. */
export * as drift from "./core/index.js";
export * from "./core/index.js";
export const compare = Object.assign(compareFunction, compareApi);
export * as driftCommand from "./drift-command.js";
export * as fingerprint from "./fingerprint.js";
export * as core from "./ghost-core/index.js";
export * as govern from "./govern.js";
export * as relay from "./relay.js";
/** @deprecated Use `fingerprint` or `@anarchitecture/ghost/fingerprint`. */
export * as scan from "./scan/index.js";
