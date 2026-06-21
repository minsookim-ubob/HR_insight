import { getAccessToken } from './workspaceAuth';

export const createCalendarEvent = async (summary: string, description: string, startTime: string, endTime: string, attendeeEmail?: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const event = {
    summary,
    description,
    start: { dateTime: startTime, timeZone: 'Asia/Seoul' },
    end: { dateTime: endTime, timeZone: 'Asia/Seoul' },
    attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to create calendar event: ${JSON.stringify(errorBody)}`);
  }

  return response.json();
};

export const listUpcomingInterviewsFromCalendar = async () => {
    // we can use list events but it's tricky to map them perfectly unless we tag them.
    // For now we will just use localStorage for simplicity, but when we create we add to calendar.
}
