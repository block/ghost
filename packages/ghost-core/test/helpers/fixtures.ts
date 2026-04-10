import { resolve } from "node:path";

export const FIXTURES_DIR = resolve(__dirname, "../fixtures");
export const REGISTRY_PATH = resolve(FIXTURES_DIR, "registry/registry.json");
export const CLEAN_DIR = resolve(FIXTURES_DIR, "consumer-clean");
export const DRIFTED_DIR = resolve(FIXTURES_DIR, "consumer-drifted");
