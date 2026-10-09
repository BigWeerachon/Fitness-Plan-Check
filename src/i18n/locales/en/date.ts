const date = {
  /** อาทิตย์ → เสาร์ (ตาม Date.getDay) */
  weekdaysShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  weekdaysMedium: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  weekdaysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  monthsLong: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  /** ปีที่แสดง = ปี ค.ศ. + offset (ไทยใช้ พ.ศ. = +543) */
  yearOffset: '0',
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  daysAgo_one: '{{count}} day ago',
  daysAgo_other: '{{count}} days ago',
  weeksAgo_one: '{{count}} week ago',
  weeksAgo_other: '{{count}} weeks ago',
  never: 'Never',
  durationHm: '{{h}} h {{m}} min',
  durationM: '{{m}} min',
} as const;

export default date;
