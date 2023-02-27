<script lang="ts">
    import type { PageServerData } from "./$types";
	import type { FileChangeEventDetail } from "$lib/components/DropArea.svelte";

	import DropArea from "$lib/components/DropArea.svelte";
	import ProgressBar from "$lib/components/ProgressBar.svelte";
	import StatusCodes from "http-status-codes";

	export let data: PageServerData;
	let statusText: HTMLParagraphElement;

	let state: "start" | "uploading" | "done" = "start";
	let percent = 0;  // [0-100]

	async function upload(event: CustomEvent<FileChangeEventDetail>): Promise<void> {
		state = "uploading";
		statusText.innerText = `📤 Uploading...`;
		const file = event.detail.file;
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
	<p bind:this={statusText}></p>
	{#if state === "start"}
		<DropArea on:fileChange={upload} />
	{:else if state === "uploading"}
		<!-- TODO: Set percent from upload progress -->
		<ProgressBar {percent}/>
	{/if}
</div>



<style>
	.upload {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 80ch;
		height: clamp(20ch, 80ch, 72vh);
	}
</style>
