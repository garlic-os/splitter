<script lang="ts">
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();
	let input: HTMLInputElement;

	// FUNNY BUSINESS: This number's truthiness determines the component's
	// .dragover class state.
	// To accomodate for how dragging over a child element triggers a dragenter
	// followed by a dragleave from the parent, we can't just use a boolean
	// otherwise the dragleave will set the class to false even though the
	// user is still dragging over the component.
	// Incrementing and decrementing this value on dragenter and dragleave
	// events and using the number's truthiness as a boolean keeps the
	// .dragover class state accurate.
	let dragover = 0;

	function handleDrop(event: DragEvent): void {
		// If this event is not prevented on the drop area <div>, the inner
		// <input> element will miss it
		event.preventDefault();
		dragover = 0;
	}

	function handleDragover(event: DragEvent): void {
		// Drop event doesn't fire if dragover isn't canceled 🤷‍♂️
		// https://stackoverflow.com/a/21341021
		event.preventDefault();
	}

	function handleKeypress(event: KeyboardEvent): void {
		if (event.key === "Enter" || event.key === " ") {
			input.click();
		}
	}

	function handleChange(): void {
		dispatch("fileChange", {
			file: input.files?.item(0) ?? null,
		});
	}
</script>



<div class="drop-area"
	 class:dragover
	 on:click={ () => input.click() }
	 on:keypress={handleKeypress}
	 on:dragenter={ () => ++dragover }
	 on:dragleave={ () => --dragover }
	 on:dragover={handleDragover}
	 on:drop={handleDrop}
>
	<div class="file icon" />
	<label>Choose or drag and drop a file
		<input type="file" bind:this={input} on:change={handleChange} />
	</label>
</div>



<style>
	.drop-area {
		position: relative;
		border: 2px solid #7d8084;
		border-radius: 50px;
		width: 90%;
		max-width: 100%;
		height: 65%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		transition: all 125ms;
	}

	.drop-area:active {
		transform: scale(99%);
	}

	.drop-area:hover, .drop-area.dragover {
		border-color: white;
	}

	.drop-area {
		cursor: pointer;
		border-style: dashed;
	}

	label {
		cursor: pointer;
	}

	input {
		display: none;
	}

	.icon {
		--side-length: clamp(2rem, 12vw, 6rem);
		display: inline-block;
		width: var(--side-length);
		height: var(--side-length);
		background-position: center center;
		background-repeat: no-repeat;
		margin-bottom: 1rem;
	}

	.icon.file {
		background-image: url("../img/image-file.svg");
	}
</style>
