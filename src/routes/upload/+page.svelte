<script lang="ts">
	// import { onMount } from "svelte";
	// import { split } from "../lib/splitter";

	let file: HTMLInputElement;
	function upload() {
		alert("TODO");
	};
</script>


<div class="root">
	<h1>Splitter</h1>
	<h2>Upload</h2>
	<div class="upload">
		<input type="file" bind:this={file} />
		<button on:click={upload}>Upload</button>
	</div>
</div>



<style>
	.root {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.upload {
		display: flex;
		flex-direction: column;
		align-items: center;
		border: 1px solid #000;
		border-radius: 2rem;
		width: 80ch;
		height: 20rem;
	}

	.upload input {
		margin-bottom: 1rem;
	}

	.upload button {
		padding: 0.5rem 1rem;
		border: 1px solid #000;
		border-radius: 0.25rem;
		background: #fff;
		cursor: pointer;
	}

	.upload button:hover {
		background: #eee;
	}

	.upload button:active {
		background: #ddd;
	}

	.upload button:focus {
		outline: none;
	}

	.upload button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
	