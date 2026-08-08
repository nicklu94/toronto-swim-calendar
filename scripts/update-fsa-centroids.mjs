import { writeFile } from "node:fs/promises";
import path from "node:path";

const query = new URL("https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/14/query");
query.search = new URLSearchParams({
  where: "CFSAUID LIKE 'M%'",
  outFields: "CFSAUID",
  returnGeometry: "true",
  outSR: "4326",
  f: "json",
});

const response = await fetch(query);
if (!response.ok) throw new Error(`Statistics Canada returned ${response.status}`);
const data = await response.json();
if (data.error) throw new Error(data.error.message);

function centroid(rings) {
  let weightedX = 0;
  let weightedY = 0;
  let areaTotal = 0;
  for (const ring of rings) {
    let twiceArea = 0;
    let xSum = 0;
    let ySum = 0;
    for (let index = 0; index < ring.length - 1; index += 1) {
      const [x1, y1] = ring[index];
      const [x2, y2] = ring[index + 1];
      const cross = x1 * y2 - x2 * y1;
      twiceArea += cross;
      xSum += (x1 + x2) * cross;
      ySum += (y1 + y2) * cross;
    }
    if (Math.abs(twiceArea) < 1e-12) continue;
    const area = twiceArea / 2;
    weightedX += (xSum / (3 * twiceArea)) * area;
    weightedY += (ySum / (3 * twiceArea)) * area;
    areaTotal += area;
  }
  if (Math.abs(areaTotal) < 1e-12) throw new Error("Cannot calculate FSA centroid");
  return { lat: weightedY / areaTotal, lng: weightedX / areaTotal };
}

const centroids = Object.fromEntries(data.features
  .map((feature) => [feature.attributes.CFSAUID, centroid(feature.geometry.rings)])
  .sort(([a], [b]) => a.localeCompare(b)));

const output = `// Generated from Statistics Canada 2021 Census FSA boundaries.\nexport const fsaCentroids: Record<string, { lat: number; lng: number }> = ${JSON.stringify(centroids, null, 2)};\n`;
await writeFile(path.resolve(import.meta.dirname, "..", "app", "fsa-centroids.ts"), output, "utf8");
console.log(`Updated ${Object.keys(centroids).length} Toronto FSA centroids.`);
