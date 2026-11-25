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
  invitationPizzaDelay: 3,
  invitationPizzaDuration: 1.5,
  reducedTransitionDuration: 0.16,
  kitchenCenter: { x: 0, y: 1, z: -8 },
} as const;

export type ExperiencePhase = 'loading' | 'exterior' | 'entering' | 'kitchen' | 'baking' | 'invitation' | 'fallback';
