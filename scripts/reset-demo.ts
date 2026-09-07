import { resetToSeed, V0_VERSION_ID } from "../src/store";

const seeded = resetToSeed();
if (seeded.currentVersionId !== V0_VERSION_ID) {
  throw new Error("Failed to reset Evolyn to v0.");
}
console.log("Evolyn demo reset to v0. No traces or promoted policies.");
