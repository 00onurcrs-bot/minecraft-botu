/**
 * main.js — Stable entrypoint
 * Runtime wiring is moved into app/* modules.
 */

import { registerControlEvents, registerBotLifecycleEvents } from "./app/index.js";

registerControlEvents();
registerBotLifecycleEvents();
