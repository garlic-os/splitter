import type { RunResult } from "better-sqlite3";
import Database from "better-sqlite3";
import * as Config from "../../../config";


export interface UploadReport {
	filename: string;
	filesize: number;
}

export interface PendingUpload {
	resolve: (report: UploadReport) => void;
	reject: (err: Error) => void;
}

export interface FileEntry {
	id: string;
	ownerID: string;
	name: string | null;
	contentType: string;
	urls: string;
	uploadToken: string;
	uploadExpiry: number;
	uploadNotificationMessageID: string | null;
}


const con = new Database(Config.databasePath);
con.pragma("journal_mode = WAL");
con.exec(`
	CREATE TABLE IF NOT EXISTS files (
		id                          TEXT    PRIMARY KEY NOT NULL UNIQUE,
		ownerID                     TEXT    NOT NULL,
		name                        TEXT    DEFAULT NULL,
		contentType                 TEXT    DEFAULT "application/octet-stream",
		urls                        TEXT    DEFAULT "",
		uploadToken                 TEXT    NOT NULL,
		uploadExpiry                INTEGER NOT NULL,
		uploadNotificationMessageID TEXT DEFAULT NULL
	)
`);


process.on("exit", () => {
	con.close();
});


export const pendingUploads = new Map<string, PendingUpload>();


// Update the file's name and content type
setMetadata.stmt = con.prepare(`
	UPDATE files
	SET name = ?, contentType = ?
	WHERE id = ?
`);
export function setMetadata(
	id: string,
	name: string,
	contentType: string
): RunResult {
	return setMetadata.stmt.run(name, contentType, id);
}

getMetadata.stmt = con.prepare(`
	SELECT name, contentType, ownerID
	FROM files
	WHERE id = ?
`);
export function getMetadata(
	id: string
): Pick<FileEntry, "name" | "contentType" | "ownerID"> | null {
	return getMetadata.stmt.get(id);
}


getURLs.stmt = con.prepare(`
	SELECT urls
	FROM files
	WHERE id = ?
`).pluck();
export function getURLs(fileID: string): string[] {
	return getURLs.stmt.get(fileID).split("\n");
}

setURLs.stmt = con.prepare(`
	UPDATE files
	SET urls = ?
	WHERE id = ?
`);
export function setURLs(fileID: string, urls: string[]): RunResult {
	return setURLs.stmt.run(urls.join("\n"), fileID);
}


disableUploading.stmt = con.prepare(`
	UPDATE files
	SET uploadExpiry = 0
	WHERE id = ?
`);
export function disableUploading(id: string): RunResult {
	return disableUploading.stmt.run(id);
}


addFile.stmt = con.prepare(`
	INSERT INTO files
	(id, ownerID, uploadToken, uploadExpiry)
	VALUES (?, ?, ?, ?)
`);
function addFile(
	fileID: string, ownerID: string, token: string, expiry: number
): RunResult {
	return addFile.stmt.run(fileID, ownerID, token, expiry);
}

deleteFile.stmt = con.prepare(`
	DELETE FROM files
	WHERE id = ?
`);
export function deleteFile(id: string): RunResult {
	return deleteFile.stmt.run(id);
}

getFileByToken.stmt = con.prepare(`
	SELECT id, uploadExpiry
	FROM files
	WHERE uploadToken = ?
`);
export function getFileByToken(
	token: string | null
): Pick<FileEntry, "id" | "uploadExpiry"> | null {
	return getFileByToken.stmt.get(token);
}

// For searching with autocomplete
interface FilenameAndID {
	id: FileEntry["id"];
	name: NonNullable<FileEntry["name"]>;
}
getFilenamesAndIDByAuthorID.stmt = con.prepare(`
	SELECT id, name
	FROM files
	WHERE ownerID = ?
	AND name LIKE ?
	AND name IS NOT NULL
`);
export function getFilenamesAndIDByAuthorID(
	ownerID: string,
	startsWith: string = ""
): FilenameAndID[] {
	return getFilenamesAndIDByAuthorID.stmt.all(ownerID, startsWith + "%");
}

setUploadNotificationMessageID.stmt = con.prepare(`
	UPDATE files
	SET uploadNotificationMessageID = ?
	WHERE id = ?
`);
export function setUploadNotificationMessageID(
	fileID: string, messageID: string
): RunResult {
	return setUploadNotificationMessageID.stmt.run(messageID, fileID);
}

getUploadNotificationMessageID.stmt = con.prepare(`
	SELECT uploadNotificationMessageID
	FROM files
	WHERE id = ?
`).pluck();
export function getUploadNotificationMessageID(
	fileID: string
): string | null {
	return getUploadNotificationMessageID.stmt.get(fileID);
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
	fileID: string, ownerID: string, token: string
): RunResult {
	const expiry = Date.now() + Config.uploadTokenLifespan;
	return addFile(fileID, ownerID, token, expiry);
}
