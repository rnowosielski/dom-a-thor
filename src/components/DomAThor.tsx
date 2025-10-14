import React, {useEffect, useState} from "react";
import {MapContainer, Polygon, TileLayer} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-path-transform";
import "leaflet-path-drag"
import "leaflet-imageoverlay-rotated"
import {DynamicCenter} from "./DynamicCenter.tsx";
import {DraggablePolygon} from "./DraggablePolygon.tsx";
import {
    calculateHouseCoordinates,
    type Coordinate,
    type CoordinateArray,
    fetchLandData
} from "../utils/coordinateUtils";
import "leaflet-loading/src/Control.Loading.css"

const mapContainerStyle = {
    width: "80vh", height: "80vh",
};

interface Props {
    landIdentifier: string | undefined;
    houseDataUrl: string | null;
    height: number;
    width: number;
    mirrorX: boolean;
    mirrorY: boolean;
}

const DomAThor: React.FC<Props> = ({landIdentifier, houseDataUrl, height, width, mirrorX, mirrorY}) => {
    const [landCoordinates, setLandCoordinates] = useState<CoordinateArray>([]);
    const [center, setCenter] = useState<Coordinate>([52.2296756, 21.0122287]);
    const [houseCoordinates, setHouseCoordinates] = useState<CoordinateArray>([]);

    // Calculate house coordinates when dimensions or center change
    useEffect(() => {
        if (width === 0 || height === 0) return;
        const newHouseCoordinates = calculateHouseCoordinates(center, width, height);
        setHouseCoordinates(newHouseCoordinates);
    }, [width, height, center]);

    // Fetch land data when land identifier changes
    useEffect(() => {
        const loadLandData = async () => {
            if (!landIdentifier) return;

            try {
                const coordinates = await fetchLandData(landIdentifier);
                if (coordinates) {
                    setLandCoordinates(coordinates);
                    // Calculate center from land coordinates
                    const centerLat = coordinates.reduce((sum, [lat]) => sum + lat, 0) / coordinates.length;
                    const centerLon = coordinates.reduce((sum, [, lon]) => sum + lon, 0) / coordinates.length;
                    setCenter([centerLat, centerLon]);
                }
            } catch (error) {
                console.error("Error loading land data:", error);
            }
        };

        loadLandData();
    }, [landIdentifier]);

    return (<>
            <MapContainer
                attributionControl={false}
                center={center}
                maxZoom={30}
                zoom={20}
                style={mapContainerStyle}
                dragging={true}
                zoomControl={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                boxZoom={true}
                keyboard={true}
                touchZoom={true}>
                <DynamicCenter center={center}/>
                <TileLayer
                    maxNativeZoom={20}
                    maxZoom={30}
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                />
                {landCoordinates.length > 0 && (<Polygon
                        positions={landCoordinates}
                        pathOptions={{
                            fillColor: "red", fillOpacity: 0, color: "red", weight: 4,
                        }}
                    />)}
                <DraggablePolygon
                    coordinates={houseCoordinates}
                    houseDataUrl={houseDataUrl}
                    mirrorX={mirrorX}
                    mirrorY={mirrorY}
                />
            </MapContainer>
        </>);
};

export default DomAThor;