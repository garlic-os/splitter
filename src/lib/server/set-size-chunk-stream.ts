/**
 * Split or merge the chunks of a stream into chunks of a given size.
 */
export default class SetSizeChunkStream extends TransformStream<Uint8Array, Uint8Array> {
	private buffer: Uint8Array;
	private offset: number;

	constructor(size: number) {
		super({
			transform: (chunk, controller) => {
				// Copy the chunk into the buffer.
				this.buffer.set(chunk, this.offset);
				this.offset += chunk.byteLength;

				// If the buffer is full, send it to the next stream.
				if (this.offset === size) {
					controller.enqueue(this.buffer);
					this.buffer = new Uint8Array(size);
					this.offset = 0;
				}
			},
			flush: (controller) => {
				// Send the remaining data to the next stream.
				if (this.offset > 0) {
					controller.enqueue(this.buffer.subarray(0, this.offset));
				}
			},
		});

		this.buffer = new Uint8Array(size);
		this.offset = 0;
	}
}
