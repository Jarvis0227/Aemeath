export type FestivalKind = "国内" | "传统" | "国际";

export type Festival = {
	name: string;
	date: Date;
	kind: FestivalKind;
};

export type CalendarObservance = {
	name: string;
	kind: "term" | "festival";
};

type FixedFestival = {
	name: string;
	month: number;
	day: number;
	kind: FestivalKind;
};

const fixedFestivals: FixedFestival[] = [
	{ name: "元旦", month: 0, day: 1, kind: "国内" },
	{ name: "情人节", month: 1, day: 14, kind: "国际" },
	{ name: "妇女节", month: 2, day: 8, kind: "国际" },
	{ name: "植树节", month: 2, day: 12, kind: "国内" },
	{ name: "圣帕特里克节", month: 2, day: 17, kind: "国际" },
	{ name: "愚人节", month: 3, day: 1, kind: "国际" },
	{ name: "劳动节", month: 4, day: 1, kind: "国际" },
	{ name: "青年节", month: 4, day: 4, kind: "国内" },
	{ name: "儿童节", month: 5, day: 1, kind: "国际" },
	{ name: "建党节", month: 6, day: 1, kind: "国内" },
	{ name: "美国独立日", month: 6, day: 4, kind: "国际" },
	{ name: "建军节", month: 7, day: 1, kind: "国内" },
	{ name: "教师节", month: 8, day: 10, kind: "国内" },
	{ name: "国庆节", month: 9, day: 1, kind: "国内" },
	{ name: "万圣夜", month: 9, day: 31, kind: "国际" },
	{ name: "双十一", month: 10, day: 11, kind: "国内" },
	{ name: "平安夜", month: 11, day: 24, kind: "国际" },
	{ name: "圣诞节", month: 11, day: 25, kind: "国际" },
	{ name: "跨年夜", month: 11, day: 31, kind: "国际" },
];

const lunarFestivals = [
	{ name: "春节", month: 1, day: 1 },
	{ name: "元宵节", month: 1, day: 15 },
	{ name: "龙抬头", month: 2, day: 2 },
	{ name: "端午节", month: 5, day: 5 },
	{ name: "七夕节", month: 7, day: 7 },
	{ name: "中元节", month: 7, day: 15 },
	{ name: "中秋节", month: 8, day: 15 },
	{ name: "重阳节", month: 9, day: 9 },
	{ name: "腊八节", month: 12, day: 8 },
	{ name: "小年", month: 12, day: 23 },
] as const;

const solarTermNames = [
	"小寒",
	"大寒",
	"立春",
	"雨水",
	"惊蛰",
	"春分",
	"清明",
	"谷雨",
	"立夏",
	"小满",
	"芒种",
	"夏至",
	"小暑",
	"大暑",
	"立秋",
	"处暑",
	"白露",
	"秋分",
	"寒露",
	"霜降",
	"立冬",
	"小雪",
	"大雪",
	"冬至",
] as const;

const solarTermMinutes = [
	0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072,
	240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210,
	440795, 462224, 483532, 504758,
];
const averageTropicalYearMs = 31_556_925_974.7;
const beijingOffsetMs = 8 * 60 * 60 * 1000;
const solarTermEpochUtcMs = Date.UTC(1900, 0, 5, 18, 5);
const lunarFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
	month: "numeric",
	day: "numeric",
});

function sameLocalDate(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function localNoon(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function nthWeekdayOfMonth(
	year: number,
	month: number,
	weekday: number,
	nth: number,
): Date {
	const first = new Date(year, month, 1);
	const offset = (weekday - first.getDay() + 7) % 7;
	return new Date(year, month, 1 + offset + (nth - 1) * 7, 12);
}

function westernEaster(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day, 12);
}

function getLunarMonthDay(date: Date) {
	const parts = lunarFormatter.formatToParts(date);
	return {
		month: Number(parts.find((part) => part.type === "month")?.value),
		day: Number(parts.find((part) => part.type === "day")?.value),
	};
}

export function getSolarTermName(date: Date): string | undefined {
	const year = date.getFullYear();
	for (let index = 0; index < solarTermMinutes.length; index += 1) {
		const utcMoment = new Date(
			solarTermEpochUtcMs +
				averageTropicalYearMs * (year - 1900) +
				solarTermMinutes[index] * 60_000,
		);
		const beijingDate = new Date(utcMoment.getTime() + beijingOffsetMs);
		if (
			beijingDate.getUTCFullYear() === date.getFullYear() &&
			beijingDate.getUTCMonth() === date.getMonth() &&
			beijingDate.getUTCDate() === date.getDate()
		) {
			return solarTermNames[index];
		}
	}
	return undefined;
}

export function getFestivalsForDate(date: Date): Festival[] {
	const festivalDate = localNoon(date);
	const year = festivalDate.getFullYear();
	const month = festivalDate.getMonth();
	const day = festivalDate.getDate();
	const festivals: Festival[] = fixedFestivals
		.filter((item) => item.month === month && item.day === day)
		.map((item) => ({ ...item, date: festivalDate }));

	const movableFestivals = [
		{ name: "复活节", date: westernEaster(year), kind: "国际" as const },
		{
			name: "母亲节",
			date: nthWeekdayOfMonth(year, 4, 0, 2),
			kind: "国际" as const,
		},
		{
			name: "父亲节",
			date: nthWeekdayOfMonth(year, 5, 0, 3),
			kind: "国际" as const,
		},
		{
			name: "感恩节",
			date: nthWeekdayOfMonth(year, 10, 4, 4),
			kind: "国际" as const,
		},
	];
	for (const item of movableFestivals) {
		if (sameLocalDate(item.date, festivalDate))
			festivals.push({ ...item, date: festivalDate });
	}

	const lunar = getLunarMonthDay(festivalDate);
	const lunarFestival = lunarFestivals.find(
		(item) => item.month === lunar.month && item.day === lunar.day,
	);
	if (lunarFestival) {
		festivals.push({ ...lunarFestival, date: festivalDate, kind: "传统" });
	}

	const tomorrow = new Date(year, month, day + 1, 12);
	const tomorrowLunar = getLunarMonthDay(tomorrow);
	if (tomorrowLunar.month === 1 && tomorrowLunar.day === 1) {
		festivals.push({ name: "除夕", date: festivalDate, kind: "传统" });
	}

	if (getSolarTermName(festivalDate) === "清明") {
		festivals.push({ name: "清明节", date: festivalDate, kind: "国内" });
	}

	return festivals;
}

export function getCalendarObservances(date: Date): CalendarObservance[] {
	const term = getSolarTermName(date);
	const observances: CalendarObservance[] = term
		? [{ name: term, kind: "term" }]
		: [];
	observances.push(
		...getFestivalsForDate(date).map(({ name }) => ({
			name,
			kind: "festival" as const,
		})),
	);
	return observances;
}

export function collectFestivals(now: Date): Festival[] {
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const festivals: Festival[] = [];
	for (let offset = 0; offset <= 400; offset += 1) {
		const date = new Date(
			start.getFullYear(),
			start.getMonth(),
			start.getDate() + offset,
			12,
		);
		festivals.push(...getFestivalsForDate(date));
	}

	const unique = new Map<string, Festival>();
	for (const festival of festivals) {
		const key = `${festival.name}-${festival.date.getFullYear()}-${festival.date.getMonth()}-${festival.date.getDate()}`;
		unique.set(key, festival);
	}

	return [...unique.values()]
		.filter((festival) => festival.date >= start)
		.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function findNextMilestone(now: Date): Festival {
	const next = collectFestivals(now)[0];
	if (!next) throw new Error("No upcoming festival was found within 400 days.");
	return next;
}
