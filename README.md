# chromasample

A dependency-free static PWA. Serve `dist/` over HTTPS (or localhost for development).

- Tap RECORD, make a sound, and tap STOP or wait for the duration limit.
- Settings provide sound-activated recording, trigger level, sample length, and volume.
- Tap or slide across the spectrum. Multitouch supports chords. Desktop keys: A W S E D F T G Y H U J K.
- SAVE SOUND stores an instrument in IndexedDB on this device. Select it from the instrument menu.
- Offline support after the first complete load; install from your browser or Add to Home Screen.

Audio: AudioWorklet capture, silence trimming, 32 kHz mono resampling, normalization, 4 ms edge fades, and 4-bit IMA ADPCM storage (~16 KB/s). Samples are limited to four seconds. Autocorrelation estimates the source pitch; low-confidence sounds use C4. Playback-rate transposition changes duration and formants, like a classic sampler. No microphone data leaves the device.

Colors map perceptually to chromatic pitch; they are not literal conversions of optical frequency to sound. Browser chrome uses a solid black theme because theme-color does not accept gradients.

Run locally: `python3 -m http.server 4173 --directory dist`

Run audio checks: `node tests/audio.test.mjs`
