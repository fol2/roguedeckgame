import { createRuntimeMetadata } from "../model/runtime-metadata";
import { starterRegistry } from "./registry";

export const currentRuntimeMetadata = createRuntimeMetadata(starterRegistry);
