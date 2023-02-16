<script lang="ts">
    import type { PageData } from "../$types";
	import StatusCodes from "http-status-codes";

	let data: PageData;
	let fileInput: HTMLInputElement;
	let statusText: HTMLParagraphElement;

	let state: "start" | "uploading" | "done" = "start";
	$: uploadReady = fileInput?.files?.length !== 0;

	async function upload() {
		if (!fileInput.files) {
			statusText.innerText = `❌ No file selected.`;
			return;
		}
		state = "uploading";
		statusText.innerText = `📤 Uploading...`;
		const file = fileInput.files[0];
		try {
			// TODO: Replace with XMLHttpRequest to get progress
			const response = await fetch("/file", {
				method: "PUT",
				headers: {
					"Authorization": data.token,
					"X-Filename": file.name,
				},
				body: file,
			});
			switch (response.status) {
				case StatusCodes.CREATED:
					state = "done";
					statusText.innerText = `✅ Upload complete!\nDownload here: ${await response.text()}`;
					break;
				case StatusCodes.UNAUTHORIZED:
					state = "start";
					statusText.innerText = "❌ Token has expired or is invalid.";
					break;
				default:
					state = "start";
					console.error({response});
					statusText.innerText = "❌ Unexpected response from the server. Check the console for more info.";
			}
		} catch (error) {
			state = "start";
			console.error(error);
			statusText.innerText = "❌ Failed to upload the file. Check the console for more info.";
		}
	}
</script>



<svelte:head>
	<title>Upload | Splitter</title>
</svelte:head>

<h1>Splitter</h1>
<h2>Upload</h2>
<div class="upload">
	{#if state === "start"}
		<input type="file" bind:this={fileInput} />
		<button on:click={upload} disabled={!uploadReady}>Upload</button>
	{:else if state === "uploading"}
		<!-- ProgressBar /-->
	{/if}
	<p bind:this={statusText}></p>
</div>



<style>
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
