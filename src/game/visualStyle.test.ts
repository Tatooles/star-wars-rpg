import { describe, expect, it } from "vitest";
import { LOOKS, resolveLook } from "./visualStyle";

describe("resolveLook", () => {
  it("keeps the current look by default and for unknown values", () => {
    expect(resolveLook("").id).toBe("legacy");
    expect(resolveLook("?look=nope").id).toBe("legacy");
  });

  it("selects a look from the query string", () => {
    expect(resolveLook("?look=cel").id).toBe("cel");
    expect(resolveLook("?foo=1&look=clone-wars").id).toBe("clone-wars");
  });

  it("leaves the legacy look's lighting untouched", () => {
    expect(LOOKS.legacy.camera.distance).toBe(7.2);
    expect(LOOKS.legacy.bloom).toBeNull();
    expect(LOOKS.legacy.toon).toBeNull();
  });
});
