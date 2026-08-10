export const DEFAULT_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'English',
  'Urdu',
  'Islamiat',
  'Pak Studies',
];

export const generateWhatsAppAttendanceReport = (
  date: string,
  present: string[],
  absent: string[],
  leave: string[],
  late: string[]
): string => {
  let msg = `*NEW BRIGHT SCHOLARS SCIENCE ACADEMY*\n`;
  msg += `📋 *DAILY STAFF ATTENDANCE REPORT*\n`;
  msg += `📅 Date: ${date}\n`;
  msg += `─────────────────────\n\n`;

  msg += `✅ *PRESENT STAFF (${present.length}):*\n`;
  msg += present.length > 0 ? present.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'None';
  msg += `\n\n`;

  msg += `❌ *ABSENT STAFF (${absent.length}):*\n`;
  msg += absent.length > 0 ? absent.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'None';
  msg += `\n\n`;

  msg += `📝 *ON LEAVE (${leave.length}):*\n`;
  msg += leave.length > 0 ? leave.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'None';
  msg += `\n\n`;

  msg += `⏰ *LATE ARRIVALS (${late.length}):*\n`;
  msg += late.length > 0 ? late.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'None';
  msg += `\n\n`;
  msg += `*Powered by Saqqa Software Service*`;

  return msg;
};