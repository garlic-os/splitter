<div class="skeleton"></div>

<style>
	.skeleton {
		width: 100%;
		height: 100%;
		background: var(--DISCORD-LIGHT);
		animation: skeleton 1s ease-in-out infinite alternate;
		border-radius: 50px;
	}

	@keyframes skeleton {
		from {
			filter: brightness(1);
		}
		to {
			filter: brightness(1.5);
		}
	}
</style>
