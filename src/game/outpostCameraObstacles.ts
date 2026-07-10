export function isLegacyCameraObstacle(name: string) {
  if (name === "Ground_Main" || name === "RaisedPlatform" || name === "BeaconDeck") return true;
  if (name.startsWith("OutpostWall_") || name.startsWith("Antenna")) return true;
  if (/^RockFormation_0[1-6]$/.test(name)) return true;
  return /^(PowerBox|PowerPanel|PowerCap)_0[1-2]$/.test(name);
}
