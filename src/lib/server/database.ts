import type { RunResult } from "better-sqlite3";
import Database from "better-sqlite3";
import * as Config from "$lib/server/config";


export interface UploadReport {
	filename: string;
	filesize: number;
}

export interface PendingUpload {
	resolve: (report: UploadReport) => void;
	reject: (err: Error) => void;
}

export interface FileEntry {
	id: bigint;
	authorID: bigint;
	uploadToken: string;
	uploadExpiry: number;
	name: string | null;
	contentType: string;
	urls: string | null;
}


const con = new Database(Config.databasePath);
con.pragma("journal_mode = WAL");
con.defaultSafeIntegers(true);  // Enable BigInt support
con.exec(`
	CREATE TABLE IF NOT EXISTS files (
		id            INTEGER PRIMARY KEY NOT NULL UNIQUE,
		authorID      INTEGER NOT NULL,
		uploadToken   TEXT    NOT NULL,
		uploadExpiry  INTEGER NOT NULL,
		name          TEXT    DEFAULT NULL,
		contentType   TEXT    DEFAULT "application/octet-stream",
		urls          TEXT    DEFAULT NULL
	)
`);


process.on("exit", () => {
	con.close();
});


// Would use a plain object but BigInt keys aren't supported
export const pendingUploads = new Map<bigint, PendingUpload>();


// Update the file's name and content type
setMetadata.stmt = con.prepare(
	"UPDATE files SET name = ?, contentType = ? WHERE id = ?"
);
export function setMetadata(
	id: bigint,
	name: string,
	contentType: string
): RunResult {
	return setMetadata.stmt.run(name, contentType, id);
}


getPartURLs.stmt = con.prepare(
	"SELECT urls FROM files WHERE id = ?"
).pluck();
export function getPartURLs(fileID: bigint): string[] | null {
	return getPartURLs.stmt.get(fileID);
}


setPartURLs.stmt = con.prepare(
	"UPDATE files SET urls = ? WHERE id = ?"
);
export function setPartURLs(fileID: bigint, urls: string[]): RunResult {
	return setPartURLs.stmt.run(urls.join("\n"), fileID);
}


getMetadata.stmt = con.prepare(
	"SELECT name FROM files WHERE id = ?"
);
export function getMetadata(
	id: bigint
): Pick<FileEntry, "name" | "contentType"> | null {
	return getMetadata.stmt.get(id);
}


getFileByToken.stmt = con.prepare(`
	SELECT id, uploadExpiry FROM files WHERE uploadToken = ?
`);
export function getFileByToken(
	token: string | null
): Pick<FileEntry, "id" | "uploadExpiry"> | null {
	return getFileByToken.stmt.get(token);
}


disableUpload.stmt = con.prepare(`
	UPDATE files SET uploadExpiry = 0 WHERE id = ?
`);
export function disableUpload(id: bigint): RunResult {
	return disableUpload.stmt.run(id);
}


addFile.stmt = con.prepare(`
	INSERT INTO files
	(id, authorID, uploadToken, uploadExpiry)
	VALUES (?, ?, ?, ?)
`);
function addFile(
	fileID: bigint, authorID: bigint, token: string, expiry: number
): RunResult {
	return addFile.stmt.run(fileID, authorID, token, expiry);
}


const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
export function generateToken(): string {
	let result = "";
	for (let i = 32; i > 0; --i) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}


export function reserveUpload(
	fileID: bigint, authorID: bigint, token: string
): RunResult {
	const expiry = Date.now() + Config.uploadTokenLifespan;
	return addFile(fileID, authorID, token, expiry);
}
