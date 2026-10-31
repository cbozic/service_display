/**
 * Adds 'storage-access' to the allow attribute of a YouTube player's iframe.
 * This enables YouTube's embed code to access the user's login cookies
 * (including YouTube Premium status) when embedded as a third-party iframe.
 */
export const enableStorageAccess = (player: any): void => {
  try {
    const iframe = player.getIframe();
    if (iframe) {
      const currentAllow = iframe.getAttribute('allow') || '';
      if (!currentAllow.includes('storage-access')) {
        iframe.setAttribute('allow', currentAllow + (currentAllow ? '; ' : '') + 'storage-access');
      }
    }
  } catch (e) {
    console.warn('[youtubeUtils] Could not set storage-access on iframe:', e);
  }
};
