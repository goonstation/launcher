// Audio service for managing background music

import { getSettings, updateSettings } from "./settingsService.ts";
import { setNoticeMessage } from "./uiService.ts";

import after_party from "../assets/audio/after_party.ogg";
import distant_star from "../assets/audio/distant_star.ogg";
import key_lime from "../assets/audio/key_lime.ogg";

// DOM Elements
let backgroundMusic: HTMLAudioElement;
let muteButton: HTMLButtonElement;

// Audio state
let isMuted = false;

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

  // Set up track rotation
  backgroundMusic.addEventListener("ended", playNextTrack);

  // Set initial track (randomly selected)
  currentTrackIndex = Math.floor(Math.random() * playlist.length);
  backgroundMusic.src = playlist[currentTrackIndex];

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

/** Switch to the next track in the playlist */
function playNextTrack() {
  // Increment to the next track, looping back to the first one if needed
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;

  // Update the audio source
  backgroundMusic.src = playlist[currentTrackIndex];

  // Only play if not muted
  if (!isMuted) {
    backgroundMusic.play().catch((error) => {
      console.error("Failed to play next track:", error);
      // Try the next one if this one fails
      playNextTrack();
    });

    // Get track name for notification
    const trackName =
      playlist[currentTrackIndex].split("/").pop()?.replace(".ogg", "") ||
      "Unknown";
    setNoticeMessage(`🎵 Now playing: ${trackName}`);
  }
}
