// Academic dates identify a day; scheduleTime carries the local class time.
// Fuctura's timetable uses Recife time (UTC-03, without daylight saving).
export function lessonTiming(
  date: Date,
  scheduleTime: string,
  now = new Date(),
) {
  const day = date.toISOString().slice(0, 10);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Recife",
  }).format(now);
  const time = scheduleTime.match(/^\s*([01]\d|2[0-3]):([0-5]\d)/);
  const start = time ? new Date(`${day}T${time[1]}:${time[2]}:00-03:00`) : date;
  return { isPast: day < today, startsInFuture: start >= now };
}
