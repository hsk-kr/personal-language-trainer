export function playBeep(): void {
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

  setTimeout(() => ctx.close(), 200);
}
