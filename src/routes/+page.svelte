<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let editingId = $state<number | null>(null);

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
	}

	function getOrdinal(n: number): string {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}

	const upcomingTotal = $derived(
		data.upcomingBills.reduce((sum, bill) => sum + bill.amount, 0)
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
								<span>
									{bill.name}
									<span class="text-amber-400/70 text-sm">({getOrdinal(bill.due_day)})</span>
								</span>
								<span class="font-mono">{formatCurrency(bill.amount)}</span>
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
			<form method="POST" action="?/add" class="flex flex-col sm:flex-row gap-3">
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
				<input
					type="number"
					name="due_day"
					placeholder="Day"
					min="1"
					max="31"
					required
					class="w-full sm:w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
				/>
				<button
					type="submit"
					class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition-colors"
				>
					Add
				</button>
			</form>
		</div>

		<div class="bg-gray-800 rounded-lg p-4">
			<h2 class="text-lg font-semibold mb-3">All Bills</h2>
			{#if data.bills.length > 0}
				<ul class="space-y-2">
					{#each data.bills as bill}
						<li class="py-2 border-b border-gray-700 last:border-0">
							{#if editingId === bill.id}
								<form method="POST" action="?/edit" class="flex flex-col sm:flex-row gap-2" use:enhance={() => { return async ({ update }) => { await update(); editingId = null; }; }}>
									<input type="hidden" name="id" value={bill.id} />
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
									<input
										type="number"
										name="due_day"
										value={bill.due_day}
										min="1"
										max="31"
										required
										class="w-full sm:w-16 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
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
								</form>
							{:else}
								<div class="flex justify-between items-center">
									<div>
										<span class="font-medium">{bill.name}</span>
										<span class="text-gray-400 text-sm ml-2">Due: {getOrdinal(bill.due_day)}</span>
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
										<form method="POST" action="?/delete">
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
