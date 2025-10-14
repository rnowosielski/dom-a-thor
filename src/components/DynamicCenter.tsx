import {useMap} from "react-leaflet";
import {useEffect} from "react";

export interface DynamicCenterProps {
    center: [number, number];
}

export const DynamicCenter: React.FC<DynamicCenterProps> = ({center}) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center); // Update the map's center
    }, [center, map]);

    return null;
};
