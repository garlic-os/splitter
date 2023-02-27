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
			// XMLHttpRequest must be used here because fetch doesn't support
			// tracking upload progress
			const response = await new Promise<Response>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open("PUT", "/file");
				xhr.setRequestHeader("Authorization", data.token);
				xhr.setRequestHeader("X-Filename", file.name);
				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						percent = Math.round((event.loaded / event.total) * 100);
					}
				};
				xhr.onload = () => {
					resolve(new Response(xhr.response, {
						status: xhr.status,
						statusText: xhr.statusText
					}));
				};
				xhr.onerror = () => {
					reject(new Error(xhr.statusText));
				};
				xhr.send(file);
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
