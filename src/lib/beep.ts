export function playBeep(): void {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.value = 0.15;

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.stop(ctx.currentTime + 0.15);

    setTimeout(() => {
      if (ctx.state !== "closed") ctx.close().catch(() => {});
    }, 300);
  } catch {
    // Audio not available — ignore
  }
}
