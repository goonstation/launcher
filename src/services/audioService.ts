// Audio service for managing background music

// DOM Elements
let backgroundMusic: HTMLAudioElement;
let muteButton: HTMLButtonElement;
let noticeLabel: HTMLElement;

// Audio state
let isMuted = false;

export function initAudioService(
  musicElement: HTMLAudioElement,
  muteElement: HTMLButtonElement,
  noticeLabelElement: HTMLElement,
) {
  backgroundMusic = musicElement;
  muteButton = muteElement;
  noticeLabel = noticeLabelElement;

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
    noticeLabel.textContent = "🔇 music muted :(";
  } else {
    backgroundMusic.play().catch(console.error);
    muteButton.textContent = "🔊";
    muteButton.classList.remove("muted");
    noticeLabel.textContent = "🔊 music unmuted :)";
  }
}
