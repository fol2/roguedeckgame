// Keep Node-based tests browser-free; Node 25 exposes localStorage by default.
Reflect.deleteProperty(globalThis, "localStorage");
