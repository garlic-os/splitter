<script lang="ts">
	import type { PageServerData } from "./$types";
	import type { FileChangeEventDetail } from "$lib/components/UploadArea.svelte";
	import UploadArea from "$lib/components/UploadArea.svelte";
	import ProgressBar from "$lib/components/ProgressBar.svelte";
	import Skeleton from "$lib/components/Skeleton.svelte";
	import { onMount } from "svelte";
	import humanFileSize from "$lib/utils/human-file-size";
	import StatusCodes from "http-status-codes";

	export let data: PageServerData;

	let state: "loading" | "start" | "uploading" | "done" = "loading";
	let statusText = "";
	let percent = 0;  // [0-100]


	function sendFile(file: File): Promise<XMLHttpRequest> {
		// XMLHttpRequest must be used because fetch doesn't support tracking
		// upload progress
		return new Promise<XMLHttpRequest>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("PUT", "/file");
			xhr.setRequestHeader("Authorization", data.token);
			xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable) {
					percent = Math.round((event.loaded / event.total) * 100);
					if (percent === 100) {
						statusText = "🔃 Processing...";
					}
				}
			};
			xhr.onload = () => {
				resolve(xhr);
			};
			xhr.onerror = () => {
				reject(new Error(xhr.statusText));
			};
			xhr.send(file);
		});
	}


	function handleResponse(xhr: XMLHttpRequest) {
		switch (xhr.status) {
			case StatusCodes.CREATED:
				state = "done";
				statusText = "✅ Upload complete! The download link has been posted in the chat.";
				break;
			case StatusCodes.UNAUTHORIZED:
				state = "start";
				statusText = "❌ Token has expired or is invalid.";
				break;
			case StatusCodes.BAD_REQUEST:
				if (xhr.responseText.includes("too large")) {
					state = "start";
					statusText = `❌ File is too large. The maximum file size is ${humanFileSize(data.fileSizeLimit)}.`;
					break;
				}
			default:
				state = "start";
				console.error({ response: xhr, body: xhr.responseText });
				statusText = "❌ Unexpected response from the server. Check the console for more info.";
		}
		percent = 0;
	}


	async function upload(event: CustomEvent<FileChangeEventDetail>): Promise<void> {
		state = "uploading";
		statusText = `📤 Uploading...`;
		const file = event.detail.file;
		try {
			const response = await sendFile(file);
			handleResponse(response);
		} catch (error) {
			state = "start";
			console.error(error);
			statusText = "❌ Failed to upload the file. Check the console for more info.";
		}
	}

	onMount(() => {
		state = "start";
	});
</script>



<svelte:head>
	<title>Upload | Splitter</title>
</svelte:head>

<h1>Splitter</h1>
<h2>Upload</h2>
<div class="upload">
	<p>{statusText}</p>
	{#if state === "loading"}
		<Skeleton />
	{:else if state === "start"}
		<UploadArea on:fileChange={upload} />
	{:else if state === "uploading" && percent !== 100}
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
