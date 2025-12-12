import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

interface Bill {
	id: number;
	name: string;
	amount: number;
	due_day: number;
}

function getNextFriday(): Date {
	const today = new Date();
	const dayOfWeek = today.getDay();
	const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, get next Friday
	const nextFriday = new Date(today);
	nextFriday.setDate(today.getDate() + daysUntilFriday);
	return nextFriday;
}

function isBillDueBeforeDate(billDueDay: number, targetDate: Date, today: Date): boolean {
	const currentMonth = today.getMonth();
	const currentYear = today.getFullYear();
	const targetMonth = targetDate.getMonth();
	const targetYear = targetDate.getFullYear();

	// Check if bill is due this month and before target date
	if (currentYear === targetYear && currentMonth === targetMonth) {
		// Bill due this month, after today, before or on target
		if (billDueDay > today.getDate() && billDueDay <= targetDate.getDate()) {
			return true;
		}
	}

	// If target date is in next month, also check next month's bills
	if (targetYear > currentYear || targetMonth > currentMonth) {
		// Bills due early next month up to target date
		if (billDueDay <= targetDate.getDate()) {
			return true;
		}
		// Bills due rest of this month after today
		if (billDueDay > today.getDate()) {
			return true;
		}
	}

	return false;
}

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		return { bills: [], upcomingBills: [], nextFriday: null };
	}

	const { results } = await db.prepare('SELECT * FROM bills ORDER BY due_day ASC').all<Bill>();
	const bills = results || [];

	const today = new Date();
	const nextFriday = getNextFriday();

	const upcomingBills = bills.filter((bill) => isBillDueBeforeDate(bill.due_day, nextFriday, today));

	return {
		bills,
		upcomingBills,
		nextFriday: nextFriday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
	};
};

export const actions: Actions = {
	add: async ({ request, platform }) => {
		const db = platform?.env?.DB;
		if (!db) return fail(500, { error: 'Database not available' });

		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');
		const due_day = parseInt(data.get('due_day')?.toString() || '0');

		if (!name) return fail(400, { error: 'Name is required' });
		if (amount <= 0) return fail(400, { error: 'Amount must be greater than 0' });
		if (due_day < 1 || due_day > 31) return fail(400, { error: 'Due day must be between 1 and 31' });

		await db.prepare('INSERT INTO bills (name, amount, due_day) VALUES (?, ?, ?)').bind(name, amount, due_day).run();

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
		const due_day = parseInt(data.get('due_day')?.toString() || '0');

		if (!id) return fail(400, { error: 'Invalid bill ID' });
		if (!name) return fail(400, { error: 'Name is required' });
		if (amount <= 0) return fail(400, { error: 'Amount must be greater than 0' });
		if (due_day < 1 || due_day > 31) return fail(400, { error: 'Due day must be between 1 and 31' });

		await db.prepare('UPDATE bills SET name = ?, amount = ?, due_day = ?, updated_at = datetime(\'now\') WHERE id = ?')
			.bind(name, amount, due_day, id).run();

		return { success: true };
	}
};
