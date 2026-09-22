# chromasample

A dependency-free static PWA. Serve `docs/` over HTTPS (or localhost for development).

- Tap RECORD, make a sound, and tap STOP or wait for the duration limit.
- Settings provide sound-activated recording, trigger level, sample length, and volume.
- The 4 × 4 grid contains 13 chromatic note pads, a current-note cell, a solfege/frequency cell, and Save Sound. Controls move beside the square grid in landscape.
- Tap or slide across the spectrum. Multitouch supports chords. Desktop keys: A W S E D F T G Y H U J K.
- Hold MAJ, MIN, SUS4, DIM, AUG, 7, MAJ7, or the extra chord button while playing a root note. Number keys 1–8 hold the same modifiers. Modifiers also change already-held notes; the most recently held modifier wins and releasing it restores any previous modifier still held. Upper chord tones can extend above the visible octave.
- Settings let you change the extra chord button (default MIN7) to sus2, diminished seventh, half diminished, add9, minor/major ninth, sixth, or power chords.
- ADSR opens attack (0–2 seconds), decay (0–2 seconds), sustain level (0–100%), and release (10 ms–3 seconds). These preferences and the extra chord choice persist on this device and apply to newly triggered notes.
- Enable **Loop while held** in ADSR to repeat a sample with softened loop seams. Without looping, a note ends at the end of its sample even if the key is held. Looping repeats the recorded sound, including any rhythm in it.
- SAVE SOUND stores an instrument in IndexedDB on this device. Select it from the instrument menu.
- Offline support after the first complete load; install from your browser or Add to Home Screen.

Audio: AudioWorklet capture, silence trimming, 32 kHz mono resampling, normalization, 4 ms edge fades, and 4-bit IMA ADPCM storage (~16 KB/s). Samples are limited to four seconds. Autocorrelation estimates the source pitch; low-confidence sounds use C4. Playback-rate transposition changes duration and formants, like a classic sampler. No microphone data leaves the device.

Colors map perceptually to chromatic pitch; they are not literal conversions of optical frequency to sound. Browser chrome uses a solid black theme because theme-color does not accept gradients.

Run locally: `python3 -m http.server 4173 --directory docs`

Run audio, keyboard, envelope, and performance interaction checks: `npm test`

## GitHub Pages

Live app: https://dontaskwhatkindofmusic.github.io/chromasample/

Publish from the `main` branch and `/docs` folder in **Settings → Pages → Deploy from a branch**. GitHub Pages publishes changes pushed to `main` automatically. The `.nojekyll` file serves the app as plain static files; no build or dependencies are required.

All asset URLs, the web manifest, and the service worker use relative paths so the PWA works under `/chromasample/` and in local development. The service worker only handles requests within its own scope and uses a separate cache for that scope. Bump the cache version in `docs/sw.js` when changing app assets.

`docs/` is the website source, `tests/` contains the audio and keyboard checks, and `package.json` supplies the local commands. Node.js 22 or newer runs the checks; Python 3 runs the local server with `npm start`.

Microphone access requires HTTPS or localhost. Recordings stay in the browser's device-local storage. Sounds saved on a previous hosting origin do not automatically move to this GitHub Pages origin.
