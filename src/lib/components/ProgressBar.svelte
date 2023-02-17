<script lang="ts">
	export let percent = 0;
</script>



<div class="progress-bar">
	<div class="completeness" style="width: {percent}%" />
</div>



<style>
	@keyframes squiggly-bar {
		0% {
			clip-path: polygon(
				0 0, 11.111% 50%, 22.222% 0, 33.333% 50%, 44.444% 0, 55.555% 50%, 66.666% 0, 77.777% 50%, 88.888% 0, 100% 50%,
				100% 100%, 88.888% 50%, 77.777% 100%, 66.666% 50%, 55.555% 100%, 44.444% 50%, 33.333% 100%, 22.222% 50%, 11.111% 100%, 0 50%
			);
		}
		50% {
			clip-path: polygon(
				0% 50%, 11.111% 0%, 22.222% 50%, 33.333% 0%, 44.444% 50%, 55.555% 0%, 66.666% 50%, 77.777% 0%, 88.888% 50%, 100% 0%,
				100% 50%, 88.888% 100%, 77.777% 50%, 66.666% 100%, 55.555% 50%, 44.444% 100%, 33.333% 50%, 22.222% 100%, 11.111% 50%, 0% 100%
			);
		}
		100% {
			clip-path: polygon(
				0 0, 11.111% 50%, 22.222% 0, 33.333% 50%, 44.444% 0, 55.555% 50%, 66.666% 0, 77.777% 50%, 88.888% 0, 100% 50%,
				100% 100%, 88.888% 50%, 77.777% 100%, 66.666% 50%, 55.555% 100%, 44.444% 50%, 33.333% 100%, 22.222% 50%, 11.111% 100%, 0 50%
			);
		}
	}

	.progress-bar {
		height: 0.5rem;
		width: 12rem;
		background-color: var(--brown);
		animation: squiggly-bar 1s linear infinite;
	}

	.completeness {
		height: 100%;
		max-width: 100%;
		background-color: var(--orange-2);
		transition: width 0.5s ease-in-out;
	}
</style>
