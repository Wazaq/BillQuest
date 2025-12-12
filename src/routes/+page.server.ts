import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

type Frequency = 'monthly' | 'annual' | 'every_n_months';

interface BillRow {
	id: number;
	name: string;
	amount: number;
	due_day: number;
	frequency: Frequency;
	frequency_months: number | null;
	anchor_date: string | null;
	paid_through: string | null;
}

export interface Bill extends BillRow {
	nextDueDate: Date;
	isDue: boolean;
	isOverdue: boolean;
	overdueCount: number;
	effectiveAmount: number;
}

function getNextFriday(): Date {
	const today = new Date();
	const dayOfWeek = today.getDay();
	const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
	const nextFriday = new Date(today);
	nextFriday.setDate(today.getDate() + daysUntilFriday);
	nextFriday.setHours(23, 59, 59, 999);
	return nextFriday;
}

function parseDate(dateStr: string | null): Date | null {
	if (!dateStr) return null;
	const d = new Date(dateStr + 'T00:00:00');
	return isNaN(d.getTime()) ? null : d;
}

function startOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

function getNextDueDate(bill: BillRow, today: Date): Date {
	const anchor = parseDate(bill.anchor_date);
	const anchorDay = anchor ? anchor.getDate() : bill.due_day;

	if (bill.frequency === 'monthly') {
		// Find next monthly due date
		const thisMonth = new Date(today.getFullYear(), today.getMonth(), anchorDay);
		if (thisMonth >= startOfDay(today)) {
			return thisMonth;
		}
		// Next month
		return new Date(today.getFullYear(), today.getMonth() + 1, anchorDay);
	}

	if (bill.frequency === 'annual' && anchor) {
		// Find next annual due date
		const thisYear = new Date(today.getFullYear(), anchor.getMonth(), anchor.getDate());
		if (thisYear >= startOfDay(today)) {
			return thisYear;
		}
		return new Date(today.getFullYear() + 1, anchor.getMonth(), anchor.getDate());
	}

	if (bill.frequency === 'every_n_months' && anchor && bill.frequency_months) {
		// Calculate next occurrence based on anchor + N month intervals
		const months = bill.frequency_months;
		let candidate = new Date(anchor);

		while (candidate < startOfDay(today)) {
			candidate.setMonth(candidate.getMonth() + months);
		}
		return candidate;
	}

	// Fallback to monthly behavior
	const thisMonth = new Date(today.getFullYear(), today.getMonth(), anchorDay);
	if (thisMonth >= startOfDay(today)) {
		return thisMonth;
	}
	return new Date(today.getFullYear(), today.getMonth() + 1, anchorDay);
}

function calculateOverdue(bill: BillRow, today: Date): { isOverdue: boolean; overdueCount: number; nextDueDate: Date } {
	const paidThrough = parseDate(bill.paid_through);
	const anchor = parseDate(bill.anchor_date);
	const todayStart = startOfDay(today);

	// If never marked paid, bill is not overdue - only current cycle counts
	// Overdue only applies once you've started tracking payments
	if (!paidThrough) {
		return {
			isOverdue: false,
			overdueCount: 0,
			nextDueDate: getNextDueDate(bill, today)
		};
	}

	let overdueCount = 0;
	let checkDate: Date;

	if (bill.frequency === 'monthly') {
		const anchorDay = anchor ? anchor.getDate() : bill.due_day;
		// Start from the month after paid_through
		checkDate = new Date(paidThrough.getFullYear(), paidThrough.getMonth(), anchorDay);
		if (checkDate <= paidThrough) {
			checkDate.setMonth(checkDate.getMonth() + 1);
		}

		// Count overdue periods (due dates that have passed since last payment)
		while (checkDate < todayStart) {
			overdueCount++;
			checkDate.setMonth(checkDate.getMonth() + 1);
		}

		return {
			isOverdue: overdueCount > 0,
			overdueCount,
			nextDueDate: getNextDueDate(bill, today)
		};
	}

	if (bill.frequency === 'annual' && anchor) {
		checkDate = new Date(anchor);

		// Move to first occurrence after paid_through
		while (checkDate <= paidThrough) {
			checkDate.setFullYear(checkDate.getFullYear() + 1);
		}

		// Count overdue periods
		while (checkDate < todayStart) {
			overdueCount++;
			checkDate.setFullYear(checkDate.getFullYear() + 1);
		}

		return {
			isOverdue: overdueCount > 0,
			overdueCount,
			nextDueDate: getNextDueDate(bill, today)
		};
	}

	if (bill.frequency === 'every_n_months' && anchor && bill.frequency_months) {
		checkDate = new Date(anchor);
		const months = bill.frequency_months;

		// Move to first occurrence after paid_through
		while (checkDate <= paidThrough) {
			checkDate.setMonth(checkDate.getMonth() + months);
		}

		// Count overdue periods
		while (checkDate < todayStart) {
			overdueCount++;
			checkDate.setMonth(checkDate.getMonth() + months);
		}

		return {
			isOverdue: overdueCount > 0,
			overdueCount,
			nextDueDate: getNextDueDate(bill, today)
		};
	}

	return {
		isOverdue: false,
		overdueCount: 0,
		nextDueDate: getNextDueDate(bill, today)
	};
}

function processBill(row: BillRow, today: Date, nextFriday: Date): Bill {
	const { isOverdue, overdueCount, nextDueDate } = calculateOverdue(row, today);
	const paidThrough = parseDate(row.paid_through);

	// Bill is due if:
	// 1. It's overdue (unpaid past cycles), OR
	// 2. Next due date is before next Friday AND not already paid for that cycle
	const isPaidForNextCycle = paidThrough && paidThrough >= nextDueDate;
	const isDueBeforeFriday = nextDueDate <= nextFriday && !isPaidForNextCycle;
	const isDue = isOverdue || isDueBeforeFriday;

	// Effective amount includes overdue cycles plus current if due
	let effectiveAmount = row.amount * overdueCount;
	if (isDueBeforeFriday && !isOverdue) {
		effectiveAmount = row.amount;
	} else if (isDueBeforeFriday && isOverdue) {
		// Check if next due is also in window
		effectiveAmount = row.amount * (overdueCount + 1);
	}

	return {
		...row,
		nextDueDate,
		isDue,
		isOverdue,
		overdueCount,
		effectiveAmount: effectiveAmount || row.amount
	};
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		return { bills: [], upcomingBills: [], nextFriday: null, today: null };
	}

	const { results } = await db.prepare('SELECT * FROM bills ORDER BY due_day ASC').all<BillRow>();
	const rows = results || [];

	const today = new Date();
	const nextFriday = getNextFriday();

	const bills: Bill[] = rows.map((row: BillRow) => processBill(row, today, nextFriday));

	// Sort all bills by next due date (soonest first)
	bills.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());

	const upcomingBills = bills.filter(bill => bill.isDue);

	return {
		bills,
		upcomingBills,
		nextFriday: nextFriday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
		today: today.toISOString().split('T')[0]
	};
};

export const actions: Actions = {
	add: async ({ request, platform }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(500, { error: 'Database not available' });

		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');
		const frequency = (data.get('frequency')?.toString() || 'monthly') as Frequency;
		const frequency_months = frequency === 'every_n_months' ? parseInt(data.get('frequency_months')?.toString() || '1') : null;
		const anchor_date = data.get('anchor_date')?.toString() || null;
		const due_day = anchor_date ? new Date(anchor_date + 'T00:00:00').getDate() : parseInt(data.get('due_day')?.toString() || '1');

		if (!name) return fail(400, { error: 'Name is required' });
		if (amount <= 0) return fail(400, { error: 'Amount must be greater than 0' });
		if (!anchor_date) return fail(400, { error: 'Due date is required' });

		await db.prepare(
			'INSERT INTO bills (name, amount, due_day, frequency, frequency_months, anchor_date) VALUES (?, ?, ?, ?, ?, ?)'
		).bind(name, amount, due_day, frequency, frequency_months, anchor_date).run();

		return { success: true };
	},

	delete: async ({ request, platform }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(500, { error: 'Database not available' });

		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');

		if (!id) return fail(400, { error: 'Invalid bill ID' });

		await db.prepare('DELETE FROM bills WHERE id = ?').bind(id).run();

		return { success: true };
	},

	edit: async ({ request, platform }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(500, { error: 'Database not available' });

		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');
		const name = data.get('name')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');
		const frequency = (data.get('frequency')?.toString() || 'monthly') as Frequency;
		const frequency_months = frequency === 'every_n_months' ? parseInt(data.get('frequency_months')?.toString() || '1') : null;
		const anchor_date = data.get('anchor_date')?.toString() || null;
		const due_day = anchor_date ? new Date(anchor_date + 'T00:00:00').getDate() : parseInt(data.get('due_day')?.toString() || '1');

		if (!id) return fail(400, { error: 'Invalid bill ID' });
		if (!name) return fail(400, { error: 'Name is required' });
		if (amount <= 0) return fail(400, { error: 'Amount must be greater than 0' });

		await db.prepare(
			'UPDATE bills SET name = ?, amount = ?, due_day = ?, frequency = ?, frequency_months = ?, anchor_date = ?, updated_at = datetime(\'now\') WHERE id = ?'
		).bind(name, amount, due_day, frequency, frequency_months, anchor_date, id).run();

		return { success: true };
	},

	markPaid: async ({ request, platform }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(500, { error: 'Database not available' });

		const data = await request.formData();
		const id = parseInt(data.get('id')?.toString() || '0');

		if (!id) return fail(400, { error: 'Invalid bill ID' });

		// Set paid_through to today
		const today = new Date().toISOString().split('T')[0];
		await db.prepare('UPDATE bills SET paid_through = ?, updated_at = datetime(\'now\') WHERE id = ?')
			.bind(today, id).run();

		return { success: true };
	}
};
