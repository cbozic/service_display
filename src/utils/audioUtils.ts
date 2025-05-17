import { FADE_STEPS } from '../App';

/**
 * Fades audio volume from current level to target volume over specified duration
 * 
 * @param player - YouTube player instance
 * @param targetVolume - Target volume level (0-100)
 * @param fadeDurationInSeconds - Duration of fade in seconds (0 for immediate change)
 * @param invokeWhenFinished - Optional callback to execute when fade completes
 * @returns A cleanup function that can cancel ongoing fade
 */
export const fadeToVolume = (
  player: any,
  targetVolume: number, 
  fadeDurationInSeconds = 0, 
  invokeWhenFinished = () => {}
): (() => void) => {
  if (!player || typeof player.getVolume !== 'function') {
    console.warn('Invalid player object or missing getVolume method');
    invokeWhenFinished();
    return () => {};
  }
  
  let fadeTimeoutRef: NodeJS.Timeout | null = null;

  // For immediate volume changes, just set directly
  if (fadeDurationInSeconds === 0) {
    try {
      if (targetVolume === 0) {
        player.mute();
      } else {
        if (player.isMuted && player.isMuted()) {
          player.unMute();
        }
        player.setVolume(targetVolume);
      }
    } catch (e) {
      console.error('Error setting volume directly:', e);
    }
    invokeWhenFinished();
    return () => {};
  }
  
  // For fade effects
  try {
    let currentVolume = 0;
    try {
      currentVolume = player.getVolume();
      if (isNaN(currentVolume)) currentVolume = 0;
    } catch (e) {
      console.error('Error getting volume:', e);
    }

    const volumeDifference = targetVolume - currentVolume;
    const steps = FADE_STEPS;
    const stepDuration = (fadeDurationInSeconds * 1000) / steps;
    let currentStep = 0;

    const fadeStep = () => {
      if (!player || typeof player.getVolume !== 'function') {
        console.warn('Player object became invalid during fade');
        invokeWhenFinished();
        return;
      }

      if (currentStep < steps) {
        const newVolume = Math.round(currentVolume + (volumeDifference * (currentStep / steps)));
        try {
          if (newVolume <= 0) {
            player.mute();
          } else {
            if (player.isMuted && player.isMuted()) {
              player.unMute();
            }
            player.setVolume(newVolume);
          }
          currentStep++;
          fadeTimeoutRef = setTimeout(fadeStep, stepDuration);
        } catch (e) {
          console.error('Error in fade step:', e);
          // Skip to end
          try {
            if (targetVolume === 0) {
              player.mute();
            } else {
              if (player.isMuted && player.isMuted()) {
                player.unMute();
              }
              player.setVolume(targetVolume);
            }
          } catch (e) {
            console.error('Error setting final volume:', e);
          }
          fadeTimeoutRef = null;
          invokeWhenFinished();
        }
      } else {
        try {
          if (targetVolume === 0) {
            player.mute();
          } else {
            if (player.isMuted && player.isMuted()) {
              player.unMute();
            }
            player.setVolume(targetVolume);
          }
        } catch (e) {
          console.error('Error setting final volume:', e);
        }
        fadeTimeoutRef = null;
        invokeWhenFinished();
      }
    };

    fadeStep();
  } catch (e) {
    console.error('Error in fade setup:', e);
    invokeWhenFinished();
  }

  return () => {
    if (fadeTimeoutRef) {
      clearTimeout(fadeTimeoutRef);
      fadeTimeoutRef = null;
    }
  };
}; 