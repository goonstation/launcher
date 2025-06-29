// Audio service for managing background music

import { getSettings, updateSettings } from "./settingsService.ts";
import { setNoticeMessage } from "./uiService.ts";

import after_party from "../assets/audio/after_party.ogg";
import distant_star from "../assets/audio/distant_star.ogg";
import key_lime from "../assets/audio/key_lime.ogg";

// DOM Elements
let backgroundMusic: HTMLAudioElement;
let muteButton: HTMLButtonElement;
let volumeSlider: HTMLInputElement;
let volumeContainer: HTMLDivElement;
let volumeLabel: HTMLDivElement;
let skipButton: HTMLButtonElement;

// Audio state
let isMuted = false; // User preference for mute
let volume = 0.5; // Current volume level

// Playlist configuration
const playlist = [
  after_party,
  distant_star,
  key_lime,
];
let currentTrackIndex = 0;

export async function initAudioService(
  musicElement: HTMLAudioElement,
  muteElement: HTMLButtonElement,
) {
  backgroundMusic = musicElement;
  muteButton = muteElement;

  const settings = await getSettings();
  isMuted = settings.isMuted ?? false;
  volume = settings.volume ?? 0.5;

  initVolumeControls();
  updateAudioState();
  initAudio();
}

/** Initialize volume controls from existing HTML */
function initVolumeControls() {
  // Get references to existing HTML elements
  volumeContainer = document.getElementById(
    "volume-controls",
  ) as HTMLDivElement;
  volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;
  volumeLabel = document.getElementById("volume-label") as HTMLDivElement;
  skipButton = document.getElementById("skip-song-button") as HTMLButtonElement;

  // Set initial volume from settings
  volumeSlider.value = (volume || 0.5).toString();
  volumeLabel.textContent = `Volume: ${Math.round((volume || 0.5) * 100)}%`;

  // Set up event listeners
  skipButton.addEventListener("click", playNextTrack);
  volumeSlider.addEventListener("input", handleVolumeChange);

  // Update volume label when slider changes
  volumeSlider.addEventListener("input", () => {
    const currentVol = parseFloat(volumeSlider.value);
    volumeLabel.textContent = `Volume: ${Math.round(currentVol * 100)}%`;
  });

  // Setup click outside to close
  document.addEventListener("click", (event) => {
    if (
      !volumeContainer.classList.contains("hidden") &&
      !volumeContainer.contains(event.target as Node) &&
      event.target !== muteButton
    ) {
      volumeContainer.classList.add("hidden");
    }
  });

  // Setup mute button to toggle volume controls visibility
  muteButton.addEventListener("click", (e) => {
    toggleVolumeControls(e);
  });
}

/** Toggle volume controls visibility */
function toggleVolumeControls(event: MouseEvent) {
  event.stopPropagation();
  volumeContainer.classList.toggle("hidden");
}

/** Update audio state and UI based on current volume and mute settings */
function updateAudioState() {
  // Ensure volume is a valid number
  if (typeof volume !== "number" || isNaN(volume)) {
    volume = 0.5;
  }

  // Update audio state - pause if volume is 0 or muted (legacy support)
  if (volume <= 0 || isMuted) {
    backgroundMusic.pause();
  } else {
    // Only play if we have audio and it's currently paused
    if (backgroundMusic.paused && backgroundMusic.src) {
      backgroundMusic.play().catch((error) =>
        console.error("Error playing audio:", error)
      );
    }
  }

  // Always set the physical volume (even when muted)
  backgroundMusic.volume = volume;

  // Update the slider and label
  volumeSlider.value = volume.toString();
  volumeLabel.textContent = `Volume: ${Math.round(volume * 100)}%`;
}

/** Handle volume slider change */
async function handleVolumeChange() {
  if (!volumeSlider) return;

  try { // Update the volume
    const newVolume = parseFloat(volumeSlider.value);
    volume = isNaN(newVolume) ? 0.5 : newVolume;

    // Save volume to settings
    await updateSettings({ volume });

    // Show the current volume with appropriate message
    if (volume <= 0) {
      setNoticeMessage("🔇 Music paused (volume: 0%)");
    } else {
      setNoticeMessage(`🎵 Volume: ${Math.round(volume * 100)}%`);
    }

    // Update UI and audio based on both volume and mute state
    updateAudioState();
  } catch (error) {
    console.error("Error handling volume change:", error);
  }
}

function initAudio() {
  // Set initial volume from settings
  backgroundMusic.volume = volume;

  backgroundMusic.addEventListener("ended", playNextTrack);

  // Set initial track (randomly selected)
  currentTrackIndex = Math.floor(Math.random() * playlist.length);
  backgroundMusic.src = playlist[currentTrackIndex];

  // Play based on current mute state and volume
  updateAudioState();
}

/** Toggle mute state (kept for compatibility with existing code) */
export async function toggleMute() {
  isMuted = !isMuted;

  // Save mute state to settings
  await updateSettings({ isMuted });

  if (isMuted) {
    setNoticeMessage("🔇 Music muted");
    backgroundMusic.pause();
  } else {
    setNoticeMessage("🔊 Music unmuted");
  }

  updateAudioState();
}

/** Temporarily mute for gameplay */
export function muteForGameplay() {
  if (!isMuted && backgroundMusic && !backgroundMusic.paused) {
    isMuted = true;
    updateAudioState();
    setNoticeMessage("🔇 Music muted for gameplay");
  }
}

/** Restore audio after gameplay if it was temporarily muted */
export async function restoreAudioAfterGameplay() {
  const settings = await getSettings();

  if (!settings.isMuted) {
    isMuted = false;
    updateAudioState();
    setNoticeMessage("🔊 Music restored after gameplay");
  }
}

/** Switch to the next track in the playlist */
function playNextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  backgroundMusic.src = playlist[currentTrackIndex];

  const trackName =
    playlist[currentTrackIndex].split("/").pop()?.replace(".ogg", "") ||
    "Unknown";

  updateAudioState();
  setNoticeMessage(
    `🎵 Skipped to: ${trackName}${volume > 0 ? "" : " (volume 0)"}`,
  );
}
