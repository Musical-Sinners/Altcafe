import notificationSoundFile from "../assets/sounds/notification.wav";

// One shared Audio instance so rapid-fire notifications (e.g. several
// orders landing at once) restart the sound instead of overlapping it
// into a mess.
let audio = null;

/**
 * Plays the notification sound. Browsers block audio before the user has
 * interacted with the page at all, so this fails silently (via .catch) on
 * that very first attempt — by the time any real notification fires the
 * admin/user has already clicked something, so this basically never
 * matters in practice.
 */
export function playNotificationSound() {
  try {
    if (!audio) audio = new Audio(notificationSoundFile);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Ignore — sound is a nice-to-have, never worth breaking the app over.
  }
}
