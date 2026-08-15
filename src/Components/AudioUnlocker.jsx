import { useEffect } from "react";
import notificationSoundFile from "../assets/sounds/notification.wav";

/**
 * Browsers block audio.play() until the page has had at least one user
 * gesture (click/tap) — otherwise it silently rejects with no visible
 * error. This "primes" the notification sound on the very first tap
 * anywhere in the app (played instantly muted+paused), so a later
 * automatic notification sound — triggered by a Firestore update, not a
 * click — is guaranteed to be allowed to play.
 */
function AudioUnlocker() {
  useEffect(() => {
    const unlock = () => {
      try {
        const audio = new Audio(notificationSoundFile);
        audio.volume = 0;
        audio.play().then(() => audio.pause()).catch(() => {});
      } catch {
        // Ignore — this is best-effort priming only.
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}

export default AudioUnlocker;
