<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let editingId = $state<number | null>(null);
	let addFrequency = $state<'monthly' | 'annual' | 'every_n_months'>('monthly');

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

	function formatDueDate(bill: any): string {
		if (!bill.nextDueDate) return `${getOrdinal(bill.due_day)}`;
		const date = new Date(bill.nextDueDate);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatFrequency(bill: any): string {
		if (bill.frequency === 'annual') return 'Annual';
		if (bill.frequency === 'every_n_months') return `Every ${bill.frequency_months} mo`;
		return 'Monthly';
	}

	function getOrdinal(n: number): string {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}

	const upcomingTotal = $derived(
		data.upcomingBills.reduce((sum, bill) => sum + bill.effectiveAmount, 0)
	);
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 p-6">
	<div class="max-w-2xl mx-auto">
		<h1 class="text-3xl font-bold mb-2">BillQuest</h1>

		{#if data.nextFriday}
			<div class="bg-amber-900/50 border border-amber-700 rounded-lg p-4 mb-6">
				<h2 class="text-lg font-semibold text-amber-200 mb-2">
					Due before {data.nextFriday}
				</h2>
				{#if data.upcomingBills.length > 0}
					<ul class="space-y-2">
						{#each data.upcomingBills as bill}
							<li class="flex justify-between items-center">
								<div class="flex items-center gap-2">
									<span>
										{bill.name}
										<span class="text-amber-400/70 text-sm">({formatDueDate(bill)})</span>
									</span>
									{#if bill.isOverdue}
										<span class="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">
											OVERDUE ({bill.overdueCount})
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<span class="font-mono">{formatCurrency(bill.effectiveAmount)}</span>
									<form method="POST" action="?/markPaid" use:enhance>
										<input type="hidden" name="id" value={bill.id} />
										<button
											type="submit"
											class="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
										>
											Paid
										</button>
									</form>
								</div>
							</li>
						{/each}
					</ul>
					<div class="border-t border-amber-700 mt-3 pt-3 flex justify-between font-semibold">
						<span>Total</span>
						<span class="font-mono">{formatCurrency(upcomingTotal)}</span>
					</div>
				{:else}
					<p class="text-amber-200/70">No bills due before next payday!</p>
				{/if}
			</div>
		{/if}

		<div class="bg-gray-800 rounded-lg p-4 mb-6">
			<h2 class="text-lg font-semibold mb-3">Add Bill</h2>
			<form method="POST" action="?/add" class="space-y-3" use:enhance>
				<div class="flex flex-col sm:flex-row gap-3">
					<input
						type="text"
						name="name"
						placeholder="Bill name"
						required
						class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
					/>
					<input
						type="number"
						name="amount"
						placeholder="Amount"
						step="0.01"
						min="0.01"
						required
						class="w-full sm:w-28 bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
					/>
				</div>
				<div class="flex flex-col sm:flex-row gap-3">
					<select
						name="frequency"
						bind:value={addFrequency}
						class="bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
					>
						<option value="monthly">Monthly</option>
						<option value="annual">Annual</option>
						<option value="every_n_months">Every N Months</option>
					</select>
					{#if addFrequency === 'every_n_months'}
						<input
							type="number"
							name="frequency_months"
							placeholder="Months"
							min="1"
							max="12"
							required
							class="w-full sm:w-24 bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
						/>
					{/if}
					<input
						type="date"
						name="anchor_date"
						required
						class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
					/>
					<button
						type="submit"
						class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition-colors"
					>
						Add
					</button>
				</div>
			</form>
		</div>

		<div class="bg-gray-800 rounded-lg p-4">
			<h2 class="text-lg font-semibold mb-3">All Bills</h2>
			{#if data.bills.length > 0}
				<ul class="space-y-2">
					{#each data.bills as bill}
						<li class="py-2 border-b border-gray-700 last:border-0">
							{#if editingId === bill.id}
								<form method="POST" action="?/edit" class="space-y-2" use:enhance={() => { return async ({ update }) => { await update(); editingId = null; }; }}>
									<input type="hidden" name="id" value={bill.id} />
									<div class="flex flex-col sm:flex-row gap-2">
										<input
											type="text"
											name="name"
											value={bill.name}
											required
											class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
										/>
										<input
											type="number"
											name="amount"
											value={bill.amount}
											step="0.01"
											min="0.01"
											required
											class="w-full sm:w-24 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
										/>
									</div>
									<div class="flex flex-col sm:flex-row gap-2">
										<select
											name="frequency"
											value={bill.frequency}
											class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
										>
											<option value="monthly">Monthly</option>
											<option value="annual">Annual</option>
											<option value="every_n_months">Every N Months</option>
										</select>
										<input
											type="number"
											name="frequency_months"
											value={bill.frequency_months || ''}
											placeholder="Months"
											min="1"
											max="12"
											class="w-full sm:w-20 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
										/>
										<input
											type="date"
											name="anchor_date"
											value={bill.anchor_date || ''}
											class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
										/>
										<div class="flex gap-2">
											<button
												type="submit"
												class="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
											>
												Save
											</button>
											<button
												type="button"
												onclick={() => editingId = null}
												class="bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded text-sm font-medium transition-colors"
											>
												Cancel
											</button>
										</div>
									</div>
								</form>
							{:else}
								<div class="flex justify-between items-center">
									<div>
										<span class="font-medium">{bill.name}</span>
										<span class="text-gray-400 text-sm ml-2">
											{formatFrequency(bill)} - Due: {formatDueDate(bill)}
										</span>
										{#if bill.isOverdue}
											<span class="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-medium ml-2">
												OVERDUE ({bill.overdueCount})
											</span>
										{/if}
									</div>
									<div class="flex items-center gap-3">
										<span class="font-mono">{formatCurrency(bill.amount)}</span>
										<button
											type="button"
											onclick={() => editingId = bill.id}
											class="text-blue-400 hover:text-blue-300 text-sm"
										>
											Edit
										</button>
										<form method="POST" action="?/delete" use:enhance>
											<input type="hidden" name="id" value={bill.id} />
											<button
												type="submit"
												class="text-red-400 hover:text-red-300 text-sm"
											>
												Delete
											</button>
										</form>
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-400">No bills yet. Add one above!</p>
			{/if}
		</div>
	</div>
</div>
