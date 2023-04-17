<script lang="ts">
	import type { PageServerData } from "./$types";
	import { onMount } from "svelte";
	import ProgressBar from "$lib/components/ProgressBar.svelte";

	export let fileInfo: PageServerData;
	let downloadButton: HTMLAnchorElement;

	let percent = 0;  // [0, 100]
	let state: "downloading" | "done" = "downloading";
	let statusText = "";
	let downloadURL = "";


	/**
	 * Present the file to the user in a way that is conscious of the file's
	 * Content-Type.
	 * If the file is a video, an image, or an audio file, embed it onto the
	 * page.
	 * If the file is text, put it into the page in a <textarea> element.
	 * Otherwise, present it as a file download.
	 */
	async function presentFile(fileBlob: Blob) {
		statusText = "🔃 Processing...";
		if (fileInfo.type === "text") {
			downloadURL = await fileBlob.text();
		} else {
			downloadURL = URL.createObjectURL(fileBlob);
		}
		if (fileInfo.type === "other") {
			statusText = "✅ Enjoy!";
			setTimeout( () => {  // TODO: Start the download without a hard-coded delay
				downloadButton.click();
			}, 1000);
		} else {
			statusText = "";
		}
		state = "done";
	}


	onMount(async () => {
		fileInfo.urls.sort();
		const blobPromises = [];
		for (const [i, url] of fileInfo.urls.entries()) {
			statusText = `📥 Downloading part ${i + 1} of ${fileInfo.urls.length}...`;
			const blobPromise = fetch(url, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
				}
			}).then(res => res.blob());
			blobPromises.push(blobPromise);
		}

		statusText = `🔃 Processing parts...`;
		const blobs = await Promise.all(blobPromises);

		// Merge the blobs.
		statusText = "🔃 Merging parts...";
		const mergedBlob = new Blob(blobs, {
			type: fileInfo.contentType,
		});

		// Give the file to the user.
		presentFile(mergedBlob);
	});
</script>



<svelte:head>
	<title>{fileInfo.filename}</title>
</svelte:head>

<div class="download">
	{#if state === "downloading"}
		<ProgressBar {percent} />
	{:else if state === "done"}
		{#if fileInfo.type === "video"}
			<video controls>
				<source src={downloadURL} type={fileInfo.contentType} />
				<track kind="captions" />
			</video>
		{:else if fileInfo.type === "image"}
			<img src={downloadURL} alt="" />
		{:else if fileInfo.type === "audio"}
			<audio controls>
				<source src={downloadURL} type={fileInfo.contentType} />
			</audio>
		{:else if fileInfo.type === "text"}
			<textarea>{downloadURL}</textarea>
		{:else}
			<a bind:this={downloadButton}
			href={downloadURL}
			download={fileInfo.filename}
			>
				If your download doesn't start within a few seconds, click here
			</a>
		{/if}
	{/if}
	<p>{statusText}</p>
</div>



<style>
	.download {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100vw;
		height: 100vh;
	}
	.download > * {
		margin: 1rem;
	}
	video {
		max-width: 100%;
		max-height: 100%;
	}

	textarea {
		min-height: 80vh;
		min-width: 50vw;
		font-family: monospace;
		background: var(--DISCORD-MID);
		border-radius: 10px;
		border: 1px solid var(--DISCORD-DARK);
		color: var(--DISCORD-PRE-TEXT);
		padding: 0.5rem;
	}
</style>
