<script lang="ts">
	export let percent = 0;
</script>



<div class="progress-bar">
	<div class="completeness" style="width: {percent}%" />
</div>



<style>
	.progress-bar {
		height: 1rem;
		width: 12rem;
		background-color: #603010;
		border-radius: 100vw;  /* Pill-shape border */
		overflow: hidden;  /* Clip children's borders */

	}

	.completeness {
		height: 100%;
		max-width: 100%;
		background-color: #e97629;
		transition: width 0.5s ease-in-out;
	}
</style>
