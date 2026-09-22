# chromasample

A dependency-free static PWA. Serve `docs/` over HTTPS (or localhost for development).

- Tap RECORD, make a sound, and tap STOP or wait for the duration limit.
- Settings provide sound-activated recording, trigger level, sample length, and volume.
- The 4 × 4 grid fills the available screen with 13 note pads, a current-note cell, a solfege/frequency cell, and Save Sound. Chord modifiers stay below the grid in both orientations; pads stretch to make use of the screen.
- Tap or slide across the spectrum. Multitouch supports chords. Desktop keys: A W S E D F T G Y H U J K. Desktop defaults to Keyboard View, placing pads in their physical QWERTY rows with a shortcut label on every playable pad. Toggle KEYBOARD VIEW to return to the 4 × 4 grid; the preference is saved. Touch devices keep the original grid.
- Hold MAJ, MIN, SUS4, DIM, AUG, 7, MAJ7, or the extra chord button while playing a root note. Desktop keys Z X C V B N M , hold the same eight modifiers, with labels inside each chord button. Number keys 1–8 remain available as aliases. Modifiers also change already-held notes; the most recently held modifier wins and releasing it restores any previous modifier still held. Upper chord tones can extend above the visible octave.
- EDIT CHORDS lets you customize all eight button positions. Choose a preset or enter a label and 1–6 semitone offsets between 0 and 24, including 0 for the root. For example, `0, 3, 7` makes a minor chord; `0, 7, 12` makes a power chord. Changes persist on this device.
- The scale button above the grid changes the root note, starting octave (2–5), and scale. Choose chromatic, major, natural or harmonic minor, Dorian, Mixolydian, Lydian, Phrygian, major/minor pentatonic, blues, or whole tone. Pads ascend row by row through 13 scale notes, continuing into higher octaves. Chord voicings remain relative to the pressed pad; they are not quantized into the selected scale.
- ADSR opens attack (0–2 seconds), decay (0–2 seconds), sustain level (0–100%), and release (10 ms–3 seconds). These preferences, chord slots, and grid scale persist on this device and apply to newly triggered notes.
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
