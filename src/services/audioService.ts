// Audio service for managing background music

import { setNoticeMessage } from "./uiService.ts";

// DOM Elements
let backgroundMusic: HTMLAudioElement;
let muteButton: HTMLButtonElement;

// Audio state
let isMuted = false;

export function initAudioService(
  musicElement: HTMLAudioElement,
  muteElement: HTMLButtonElement,
) {
  backgroundMusic = musicElement;
  muteButton = muteElement;
  initAudio();
}

function initAudio() {
  // Set initial volume
  backgroundMusic.volume = 0.5;

  backgroundMusic.play().catch((error) => {
    console.error("Audio playback failed:", error);
  });

  // Set up mute button click handler
  muteButton.addEventListener("click", toggleAudio);
}

function toggleAudio() {
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
}
