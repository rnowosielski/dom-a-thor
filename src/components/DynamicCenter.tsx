import {useMap} from "react-leaflet";
import {useEffect} from "react";

export interface DynamicCenterProps {
    center: [number, number];
}

export const DynamicCenter: React.FC<DynamicCenterProps> = ({center}) => {
    const map = useMap();

    useEffect(() => {
        const zoom = typeof map.getZoom === "function" ? map.getZoom() : undefined;
        map.setView(center, zoom, { animate: false });
    }, [center, map]);

    return null;
};
