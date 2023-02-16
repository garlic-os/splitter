<script lang="ts">
	import type { PageData } from "./$types";
	import { onMount } from "svelte";

	let data: PageData;
	let state: "downloading" | "done" = "downloading";
	let downloadURL = "";

	let statusText: HTMLParagraphElement;
	let downloadButton: HTMLAnchorElement;

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

		// Merge the blobs and download it.
		statusText.innerText = "🔃 Merging parts...";
		const mergedBlob = new Blob(blobs, {
			type: "application/octet-stream",
		});

		statusText.innerText = "🔃 Preparing download...";
		const objectURL = URL.createObjectURL(mergedBlob);
		downloadURL = objectURL;
		statusText.innerText = "✅ Enjoy!";
		downloadButton.click();
	});
</script>



<svelte:head>
	<title>Download | Splitter</title>
</svelte:head>

<h1>Splitter</h1>
<h2>{data.filename}</h2>
<div class="upload">
	{#if state === "downloading"}
		<!-- ProgressBar /-->
	{:else if state === "done"}
		<a bind:this={downloadButton} href={downloadURL} download={data.filename}>
			If your download doesn't start within a few seconds, click here
		</a>
	{/if}
	<p bind:this={statusText}></p>
</div>
