/** All guest-facing event information. Empty venue/RSVP values are intentional. */
export const CONFIG = {
  title: "Mike's Pizza Party",
  date: 'Saturday, 5 December 2026',
  dateShort: '05 DEC 2026',
  /** Calendar prop uses this ISO date; display copy stays explicitly editable. */
  calendarDate: '2026-12-05',
  time: '18:00',
  venue: '',
  rsvpUrl: '',
  entranceDuration: 3.4,
  bakeDuration: 1.25,
  inviteFadeOutDuration: .28,
  inviteFadeInDuration: .42,
  invitationPizzaDelay: 3,
  invitationPizzaDuration: 1.5,
  crtGlitchInterval: 5.4,
  crtGlitchDelay: .18,
  crtGlitchDuration: .48,
  reducedTransitionDuration: 0.16,
  kitchenCenter: { x: 0, y: 1, z: -8 },
  audio: {
    masterVolume: .65,
    effectsVolume: .7,
    rainVolume: .24,
    musicVolume: .18,
    crossfadeSeconds: 1.1,
    maxVoices: 6,
  },
} as const;

export type ExperiencePhase = 'loading' | 'exterior' | 'entering' | 'kitchen' | 'baking' | 'invitation' | 'fallback';
