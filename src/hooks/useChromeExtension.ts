import { useState, useEffect } from 'react';

export interface LandDetails {
  width: number;
  height: number;
  imageUrl: string;
  imageDataUrl?: string | null;
  sourceWidth?: number;
  sourceHeight?: number;
}

const CONTENT_SCRIPT_FILE = 'content.js';

const isSupportedProjectPage = (url?: string) =>
  Boolean(
    url &&
      (url.includes('extradom.pl') ||
        url.includes('archon.pl') ||
        url.includes('projektyzwizja.pl') ||
        url.includes('mgprojekt.com.pl'))
  );

const sendMessageToTab = (
  tabId: number
): Promise<{ data?: string | null; error?: string }> =>
  new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'getLandDetails' }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        resolve({ error: lastError.message ?? 'Unknown messaging error' });
        return;
      }

      resolve(response ?? {});
    });
  });

const injectContentScript = async (tabId: number) => {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [CONTENT_SCRIPT_FILE],
  });
};

const shouldInjectContentScript = (error?: string) =>
  Boolean(
    error &&
      (error.includes('Receiving end does not exist') ||
        error.includes('Could not establish connection'))
  );

export const useChromeExtension = () => {
  const [landDetails, setLandDetails] = useState<LandDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLandDetails = async () => {
      if (typeof window === 'undefined' || !window.chrome?.tabs?.sendMessage) {
        return;
      }

      setIsLoading(true);
      setConnectionError(null);

      try {
        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });

        const activeTab = tabs[0];
        if (!activeTab?.id) {
          setConnectionError('No active tab');
          return;
        }

        if (!isSupportedProjectPage(activeTab.url)) {
          setConnectionError(
            'Open a supported project page on extradom.pl, archon.pl, projektyzwizja.pl, or mgprojekt.com.pl first'
          );
          return;
        }

        let response = await sendMessageToTab(activeTab.id);

        if (shouldInjectContentScript(response.error)) {
          try {
            await injectContentScript(activeTab.id);
            response = await sendMessageToTab(activeTab.id);
          } catch (injectError) {
            console.error('Failed to inject content script:', injectError);
          }
        }

        if (response.error) {
          setConnectionError(`${response.error}. Reload the project page and try again.`);
          return;
        }

        if (!response.data) {
          setConnectionError('Could not read plot details from this page');
          return;
        }

        const parsedData = JSON.parse(response.data) as LandDetails;
        setLandDetails(parsedData);
      } catch (error) {
        console.error('Error fetching land details from Chrome extension:', error);
        setConnectionError('Failed to read plot details from the active tab');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchLandDetails();
  }, []);

  return { landDetails, isLoading, connectionError };
};
