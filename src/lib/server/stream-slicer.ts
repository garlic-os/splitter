/**
 * Split or merge the chunks of a stream into chunks of a given size.
 */
export default class StreamSlicer extends TransformStream<Uint8Array, Uint8Array> {
	private buffer: Uint8Array;
	private offset: number;

	constructor(size: number) {
		super({
			transform: (chunk, controller) => {
				// Copy the chunk into the buffer.
				// If the chunk is too big to fit, copy in what fits, send out
				// the buffer, then loop to copy the rest.
				let dataRemaining = chunk.byteLength;
				do {
					const spaceLeft = size - this.offset;
					this.buffer.set(
						chunk.subarray(
							0,
							Math.min(chunk.byteLength, spaceLeft)
						),
						this.offset
					);
					dataRemaining = Math.max(chunk.byteLength - spaceLeft, 0);
					if (chunk.byteLength >= spaceLeft) {
						// Buffer is now full, so send it out.
						controller.enqueue(this.buffer);
						this.buffer = new Uint8Array(size);
						this.offset = 0;
						chunk = chunk.subarray(spaceLeft);
					} else {
						this.offset += chunk.byteLength;
					}
				} while (dataRemaining > 0);
			},

			flush: (controller) => {
				// Send out any remaining data.
				if (this.offset > 0) {
					controller.enqueue(this.buffer.subarray(0, this.offset));
				}
			}
		});

		this.buffer = new Uint8Array(size);
		this.offset = 0;
	}
}
