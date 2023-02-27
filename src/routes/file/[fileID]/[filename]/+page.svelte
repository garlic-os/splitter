<script lang="ts">
	import type { PageServerData } from "./$types";
	import { onMount } from "svelte";
	import ProgressBar from "$lib/components/ProgressBar.svelte";

	export let data: PageServerData;
	let state: "downloading" | "done" = "downloading";
	let downloadURL = "";
	let percent = 0;  // [0, 100]

	let statusText: HTMLParagraphElement;
	let downloadButton: HTMLAnchorElement;


	/**
	 * Presents the file to the user. The way it does it depends on the file's
	 * Content-Type.
	 * If the file is a video, an image, or an audio file, it will be embedded
	 * onto the page as its respective HTML element.
	 * If the file is text, it will be put into the page in a <pre> element.
	 * Otherwise, it will be downloaded.
	 * @param fileBlob
	 */
	async function presentFile(fileBlob: Blob) {
		statusText.innerText = "🔃 Processing...";
		if (data.type === "text") {
			downloadURL = await fileBlob.text();
		} else {
			downloadURL = URL.createObjectURL(fileBlob);
		}
		if (data.type === "other") {
			statusText.innerText = "✅ Enjoy!";
			setTimeout( () => {  // TODO: Start the download without a hard-coded delay
				downloadButton.click();
			}, 1000);
		} else {
			statusText.innerText = "";
		}
		state = "done";
	}


	onMount(async () => {
		data.urls.sort();
		const blobPromises = [];
		for (const [i, url] of data.urls.entries()) {
			statusText.innerText = `📥 Downloading part ${i + 1} of ${data.urls.length}...`;
			const blobPromise = fetch(url, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
				}
			}).then(res => res.blob());
			blobPromises.push(blobPromise);
		}

		statusText.innerText = `🔃 Processing parts...`;
		const blobs = await Promise.all(blobPromises);

		// Merge the blobs.
		statusText.innerText = "🔃 Merging parts...";
		const mergedBlob = new Blob(blobs, {
			type: data.contentType,
		});

		// Give the file to the user.
		presentFile(mergedBlob);
	});
</script>



<svelte:head>
	<title>Download | Splitter</title>
</svelte:head>

<h1>Splitter</h1>
<h2>{data.filename}</h2>
<div class="upload">
	{#if state === "downloading"}
		<ProgressBar {percent} />
	{:else if state === "done"}
		{#if data.type === "video"}
			<video controls>
				<source src={downloadURL} type={data.contentType} />
				<track kind="captions" />
			</video>
		{:else if data.type === "image"}
			<img src={downloadURL} alt="" />
		{:else if data.type === "audio"}
			<audio controls>
				<source src={downloadURL} type={data.contentType} />
			</audio>
		{:else if data.type === "text"}
			<pre>{downloadURL}</pre>
		{:else}
			<a bind:this={downloadButton}
			href={downloadURL}
			download={data.filename}
			>
				If your download doesn't start within a few seconds, click here
			</a>
		{/if}
	{/if}
	<p bind:this={statusText}></p>
</div>
