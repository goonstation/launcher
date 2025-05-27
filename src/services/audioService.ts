// Audio service for managing background music

import { getSettings, updateSettings } from "./settingsService.ts";
import { setNoticeMessage } from "./uiService.ts";

// DOM Elements
let backgroundMusic: HTMLAudioElement;
let muteButton: HTMLButtonElement;

// Audio state
let isMuted = false;

export async function initAudioService(
  musicElement: HTMLAudioElement,
  muteElement: HTMLButtonElement,
) {
  backgroundMusic = musicElement;
  muteButton = muteElement;

  const settings = await getSettings();
  isMuted = settings.isMuted;

  if (isMuted) {
    muteButton.textContent = "🔇";
    muteButton.classList.add("muted");
  }

  initAudio();
}

function initAudio() {
  // Set initial volume
  backgroundMusic.volume = 0.5;

  if (!isMuted) {
    backgroundMusic.play().catch((error) => {
      console.error("Audio playback failed:", error);
    });
  }

  // Set up mute button click handler
  muteButton.addEventListener("click", toggleAudio);
}

/** Toggle audio mute state and save preference */
async function toggleAudio() {
  isMuted = !isMuted;

  if (isMuted) {
    backgroundMusic.pause();
    muteButton.textContent = "🔇";
    muteButton.classList.add("muted");
    setNoticeMessage("🔇 music muted :(");
  } else {
    backgroundMusic.play().catch(console.error);
    muteButton.textContent = "🔊";
    muteButton.classList.remove("muted");
    setNoticeMessage("🔊 music unmuted :)");
  }

  // Save the mute state to user settings
  await updateSettings({ isMuted });
}
