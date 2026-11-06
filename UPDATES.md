# Updates

- Run native desktop UI verification minimized or headlessly. Do not foreground
  windows, move the user's pointer, or otherwise interrupt their desktop unless
  they explicitly request interactive testing.

- Keep the default web build and standalone viewer synchronized; use the maintained desktop output for `.rep` and remove obsolete duplicate artifacts.
- For Remastered, use separate engine builds selected by replay format and
  compare desyncs directly against sagi.gg/alexpineda's OpenBW. Account for
  small simulation differences and Remastered's extended terrain tables.
