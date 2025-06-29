// Audio service for managing background music

import { getSettings, updateSettings } from "./settingsService.ts";
import { setNoticeMessage } from "./uiService.ts";

import after_party from "../assets/audio/after_party.ogg";
import distant_star from "../assets/audio/distant_star.ogg";
import key_lime from "../assets/audio/key_lime.ogg";

// DOM Elements
let backgroundMusic: HTMLAudioElement;
let muteButton: HTMLButtonElement;
let volumeSlider: HTMLInputElement | null = null;
let volumeContainer: HTMLDivElement | null = null;

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

  try {
    const settings = await getSettings();
    isMuted = settings.isMuted ?? false;
    volume = settings.volume ?? 0.5;
  } catch (error) {
    console.error("Error loading audio settings:", error);
    // Default values if settings can't be loaded
    isMuted = false;
    volume = 0.5;
  }

  createVolumeControls();
  updateAudioState();
  initAudio();
}

/** Create volume slider UI */
function createVolumeControls() {
  // Create volume container
  volumeContainer = document.createElement("div");
  volumeContainer.className = "volume-controls";

  // Create wrapper for better organization
  const controlsWrapper = document.createElement("div");
  controlsWrapper.className = "volume-controls-wrapper";

  // Create skip song button instead of mute button
  const skipButton = document.createElement("button");
  skipButton.className = "volume-skip-button glow-button";
  skipButton.textContent = "⏭️ Skip Song";

  skipButton.addEventListener("click", () => {
    playNextTrack();
  });

  // Create volume slider
  volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "1";
  volumeSlider.step = "0.01";
  volumeSlider.value = (volume || 0.5).toString();
  volumeSlider.className = "volume-slider";

  volumeSlider.addEventListener("input", handleVolumeChange);

  // Add current volume label
  const volumeLabel = document.createElement("div");
  volumeLabel.textContent = `Volume: ${Math.round((volume || 0.5) * 100)}%`;
  volumeLabel.className = "volume-label";

  volumeSlider.addEventListener("input", () => {
    if (volumeSlider) {
      const currentVol = parseFloat(volumeSlider.value);
      volumeLabel.textContent = `Volume: ${Math.round(currentVol * 100)}%`;
    }
  });

  // Add elements to the container
  controlsWrapper.appendChild(volumeSlider);
  controlsWrapper.appendChild(volumeLabel);
  controlsWrapper.appendChild(skipButton);
  volumeContainer.appendChild(controlsWrapper);
  document.body.appendChild(volumeContainer);

  // Setup click outside to close
  document.addEventListener("click", (event) => {
    if (
      volumeContainer &&
      volumeContainer.classList.contains("visible") &&
      !volumeContainer.contains(event.target as Node) &&
      event.target !== muteButton
    ) {
      volumeContainer.classList.remove("visible");
    }
  });

  // Setup mute button to only toggle volume controls visibility
  muteButton.addEventListener("click", (e) => {
    toggleVolumeControls(e);
  });
}

/** Toggle volume controls visibility */
function toggleVolumeControls(event: MouseEvent) {
  event.stopPropagation();
  if (volumeContainer) {
    volumeContainer.classList.toggle("visible");
  }
}

/** Update audio state and UI based on current volume and mute settings */
function updateAudioState() {
  // Ensure volume is a valid number
  if (typeof volume !== "number" || isNaN(volume)) {
    volume = 0.5;
  }

  // Update the UI - keep volume icon consistent since it's now just a control opener
  if (muteButton) {
    muteButton.textContent = "🎵"; // Always show volume icon since it's a control button
    muteButton.title = "Volume Controls";
  }

  // Update audio state - pause if volume is 0 or muted (legacy support)
  if (volume <= 0 || isMuted) {
    if (backgroundMusic) {
      backgroundMusic.pause();
    }
  } else {
    // Only play if we have audio and it's currently paused
    if (backgroundMusic && backgroundMusic.paused && backgroundMusic.src) {
      backgroundMusic.play().catch((error) =>
        console.error("Error playing audio:", error)
      );
    }
  }

  // Always set the physical volume (even when muted)
  if (backgroundMusic) {
    backgroundMusic.volume = volume;
  }

  // Update the slider if it exists
  if (volumeSlider) {
    volumeSlider.value = volume.toString();
  }
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

  // Set up track rotation
  backgroundMusic.addEventListener("ended", playNextTrack);

  // Set initial track (randomly selected)
  currentTrackIndex = Math.floor(Math.random() * playlist.length);
  backgroundMusic.src = playlist[currentTrackIndex];

  // Play based on current mute state and volume
  updateAudioState();
}

/** Toggle mute state (kept for compatibility with existing code) */
export async function toggleMute() {
  // Toggle the muted state
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
    // Just set mute state without changing volume
    isMuted = true;

    // Update state and UI
    updateAudioState();

    setNoticeMessage("🔇 Music muted for gameplay");
  }
}

/** Restore audio after gameplay if it was temporarily muted */
export async function restoreAudioAfterGameplay() {
  // Get current settings
  const settings = await getSettings();

  // Only restore if we should be unmuted according to settings
  if (!settings.isMuted) {
    isMuted = false;

    // Update state and UI
    updateAudioState();

    setNoticeMessage("🔊 Music restored after gameplay");
  }
}

/** Switch to the next track in the playlist */
function playNextTrack() {
  // Increment to the next track, looping back to the first one if needed
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;

  // Update the audio source
  backgroundMusic.src = playlist[currentTrackIndex];

  // Get track name for notification
  const trackName =
    playlist[currentTrackIndex].split("/").pop()?.replace(".ogg", "") ||
    "Unknown";

  // Apply current audio state
  updateAudioState();

  // Always show notification when skipping tracks, even if volume is low
  // Only don't show if completely muted
  if (volume > 0) {
    setNoticeMessage(`🎵 Skipped to: ${trackName}`);
  } else {
    // If volume is 0, just update without playing
    setNoticeMessage(`Track changed to: ${trackName} (volume is 0)`);
  }
}
