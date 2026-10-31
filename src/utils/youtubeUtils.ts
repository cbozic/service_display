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

// YouTube draws its title, pause icon and logo inside the iframe every time playback
// starts or seeks, then hides them after a few seconds. No player parameter disables
// this and the iframe is cross-origin, so the only option is to wait it out behind a cover.
export const CHROME_HOLD_MS = 4500;
// Slow playback keeps the hold from consuming much video. Changing the rate doesn't
// bring the chrome back, unlike seeking.
export const CHROME_HOLD_PLAYBACK_RATE = 0.25;
// If playback never settles (stuck buffering), stop hiding the video from the room.
export const CHROME_HOLD_MAX_MS = 15000;
const CHROME_HOLD_POLL_MS = 100;
const SEEK_DETECT_SECONDS = 1;
const YT_PAUSED = 2;
const YT_PLAYING = 1;

/**
 * Starts playback muted and slowed, and calls onClear once the chrome should be gone.
 * The hold restarts whenever playback stalls or jumps, because both re-show the chrome.
 * Returns a function that cancels the hold without calling onClear.
 *
 * @param rewind - Back up by the video the hold will consume, to resume on the same
 *   frame. Only done from the paused state: seeking a cued player leaves it stuck buffering.
 */
export const startPlaybackBehindCover = (
  player: any,
  { rewind, onClear }: { rewind: boolean; onClear: () => void }
): (() => void) => {
  player.mute();
  if (rewind && player.getPlayerState() === YT_PAUSED) {
    const consumedSeconds = (CHROME_HOLD_MS / 1000) * CHROME_HOLD_PLAYBACK_RATE;
    const currentTime = player.getCurrentTime();
    if (currentTime >= consumedSeconds) {
      player.seekTo(currentTime - consumedSeconds, true);
    }
  }
  player.setPlaybackRate(CHROME_HOLD_PLAYBACK_RATE);
  player.playVideo();

  const startedAt = Date.now();
  let settledAt: number | null = null;
  let lastTime: number | null = null;

  const interval = setInterval(() => {
    let cleared = Date.now() - startedAt >= CHROME_HOLD_MAX_MS;
    try {
      const time = player.getCurrentTime();
      const jumped = lastTime !== null && Math.abs(time - lastTime) > SEEK_DETECT_SECONDS;
      lastTime = time;
      if (player.getPlayerState() !== YT_PLAYING || jumped) {
        settledAt = null;
      } else if (settledAt === null) {
        settledAt = Date.now();
      }
      cleared = cleared || (settledAt !== null && Date.now() - settledAt >= CHROME_HOLD_MS);
    } catch (e) {
      console.warn('[youtubeUtils] Could not read player state during hold:', e);
      cleared = true;
    }
    if (cleared) {
      clearInterval(interval);
      player.setPlaybackRate(1);
      onClear();
    }
  }, CHROME_HOLD_POLL_MS);

  return () => {
    clearInterval(interval);
    player.setPlaybackRate(1);
  };
};
