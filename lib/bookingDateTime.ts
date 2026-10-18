/** Reject invalid calendar dates instead of letting Date normalise them. */
export function bookingDateTime(date: unknown, time: unknown): Date | null {
  if (typeof date !== "string" || typeof time !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) return null;
  const value = new Date(`${date}T${time}`);
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  if (!Number.isFinite(value.getTime()) || value.getFullYear() !== year ||
      value.getMonth() + 1 !== month || value.getDate() !== day ||
      value.getHours() !== hour || value.getMinutes() !== minute ||
      value.getSeconds() !== second) return null;
  return value;
}
