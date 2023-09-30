import * as fs from "fs/promises";
import * as tempy from "tempy";
import * as db from "$lib/server/database";
import * as bot from "$lib/server/bot";
import StreamSlicer from "./stream-slicer";


export default class ChunkUploader {
	private filename: string;
	private fileID: DB.FileEntry["id"];
	private filePaths: string[];
	private readable: ReadableStream<Uint8Array>;
	private slicer: StreamSlicer;
	private writable: WritableStream<Uint8Array>;
	private chunkIndex = 0;
	private bytesRead = 0;

	constructor(
		stream: ReadableStream<Uint8Array>,
		filename: string,
		fileID: DB.FileEntry["id"]
	) {
		this.readable = stream;
		this.filename = filename;
		this.fileID = fileID;
		this.slicer = new StreamSlicer(bot.chunkSize);
		this.writable = new WritableStream<Uint8Array>(this.sink);
		this.filePaths = [];
	}

	private sink: UnderlyingSink<Uint8Array> = {
		write: async (chunk: Uint8Array) => {
			console.info(`[UPLOAD ${this.fileID}] Chunk ${this.filePaths.length}: ${chunk.byteLength} bytes`);
			this.bytesRead += chunk.byteLength;
			this.filePaths.push(await tempy.temporaryWrite(chunk));
			if (this.filePaths.length >= 10) {
				await this.uploadCollectedChunks();
				this.chunkIndex += this.filePaths.length;
				this.filePaths.length = 0;
			}
		},
	
		close: async () => {
			if (this.filePaths.length > 0) {
				await this.uploadCollectedChunks();
			}
			console.info(`[UPLOAD ${this.fileID}] Chunk uploads complete`);
		}
	};

	// @pre: filePaths.length <= 10
	private async uploadCollectedChunks(): Promise<void> {
		console.info(`[UPLOAD ${this.fileID}] Sending chunks [${this.chunkIndex}, ${this.chunkIndex + this.filePaths.length - 1}] to Discord`);
		const filenames: string[] = [];
		for (let i = 0; i < this.filePaths.length; i++) {
			filenames.push(`${this.filename}.chunk${this.chunkIndex + i}`);
		}
		const { messageID, urls } = await bot.uploadToDiscord(this.filePaths, filenames);
		db.addChunks(this.fileID, messageID, urls);
		this.filePaths.forEach(fs.unlink);
	}

	public async run(): Promise<number> {
		await this.readable
			.pipeThrough(this.slicer)
			.pipeTo(this.writable);
		return this.bytesRead;
	}
}
