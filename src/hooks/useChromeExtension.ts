import { useState, useEffect } from 'react';

export interface LandDetails {
  width: number;
  height: number;
  imageUrl: string;
}

export const useChromeExtension = () => {
  const [landDetails, setLandDetails] = useState<LandDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLandDetails = async () => {
      if (typeof window === 'undefined' || !window.chrome) {
        return;
      }

      setIsLoading(true);
      
      try {
        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });

        const activeTab = tabs[0];
        if (!activeTab?.id) {
          return;
        }

        const response = await new Promise<any>((resolve) => {
          chrome.tabs.sendMessage(activeTab.id!, { action: 'getLandDetails' }, resolve);
        });

        if (response?.data) {
          const parsedData = JSON.parse(response.data) as LandDetails;
          setLandDetails(parsedData);
        }
      } catch (error) {
        console.error('Error fetching land details from Chrome extension:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLandDetails();
  }, []);

  return { landDetails, isLoading };
};
