import proj4 from "proj4";
import { type GeoJSONGeometryOrNull, type GeoJSONPosition, parse } from "wellknown";

export const EPSG2180 = "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
export const WGS84 = "EPSG:4326";

export type Coordinate = [number, number];
export type CoordinateArray = Coordinate[];

/**
 * Transform coordinates from EPSG2180 to WGS84
 */
export function transformCoordinates(coordinates: GeoJSONPosition[]): CoordinateArray {
  return coordinates.map((position: GeoJSONPosition) => {
    const [x, y] = position;
    const [lon, lat] = proj4(EPSG2180, WGS84, [x, y]);
    return [lat, lon];
  });
}

/**
 * Calculate the center point of a polygon from its coordinates
 */
export function calculatePolygonCenter(coordinates: CoordinateArray): Coordinate {
  const center = coordinates.reduce(
    (acc, [lat, lon]) => [acc[0] + lat, acc[1] + lon],
    [0, 0] as [number, number]
  );
  return [center[0] / coordinates.length, center[1] / coordinates.length];
}

/**
 * Calculate house coordinates based on dimensions and center point
 */
export function calculateHouseCoordinates(
  center: Coordinate,
  width: number,
  height: number
): CoordinateArray {
  const lat = center[0];
  const metersPerDegLat = 111_132;
  const metersPerDegLon = 111_320 * Math.cos((lat * Math.PI) / 180);

  const dlat = (height / 2) / metersPerDegLat;
  const dlon = (width / 2) / metersPerDegLon;

  return [
    [-dlat + center[0], -dlon + center[1]],
    [dlat + center[0], -dlon + center[1]],
    [dlat + center[0], dlon + center[1]],
    [-dlat + center[0], dlon + center[1]],
  ];
}

/**
 * Parse WKT geometry and extract coordinates
 */
export function parseWKTGeometry(wktData: string): CoordinateArray | null {
  const geometry: GeoJSONGeometryOrNull = parse(wktData);
  
  if (geometry && geometry.type === "Polygon" && geometry.coordinates && geometry.coordinates[0]) {
    return transformCoordinates(geometry.coordinates[0]);
  }
  
  return null;
}

/**
 * Fetch land data from the Polish land registry API
 */
export async function fetchLandData(landIdentifier: string): Promise<CoordinateArray | null> {
  try {
    const response = await fetch(
      `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${landIdentifier}&result=geom_wkt`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const wktData = await response.text();
    return parseWKTGeometry(wktData);
  } catch (error) {
    console.error("Error fetching land data:", error);
    return null;
  }
}
