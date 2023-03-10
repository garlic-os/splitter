import type { RunResult } from "better-sqlite3";
import Database from "better-sqlite3";
import * as Config from "../../../config";


const con = new Database(Config.databasePath);
con.pragma("journal_mode = WAL");
con.exec(`
	CREATE TABLE IF NOT EXISTS files (
		id                    TEXT     NOT NULL PRIMARY KEY UNIQUE,
		ownerID               TEXT     NOT NULL,
		uploadToken           TEXT     NOT NULL,
		uploadExpiry          INTEGER  NOT NULL,
		name                  TEXT     DEFAULT NULL,
		contentType           TEXT     DEFAULT "application/octet-stream",
		uploadNotificationID  TEXT     DEFAULT NULL
	);

	CREATE TABLE IF NOT EXISTS parts (
		fileID     TEXT  NOT NULL PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
		messageID  TEXT  NOT NULL,
		url        TEXT  NOT NULL
	);
`);


process.on("exit", () => {
	con.close();
});


export const pendingUploads = new Map<string, DB.PendingUpload>();


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
): Pick<DB.FileEntry, "name" | "contentType" | "ownerID"> | null {
	return getMetadata.stmt.get(id);
}


getURLs.stmt = con.prepare(`
	SELECT url
	FROM parts
	WHERE fileID = ?
`).pluck();
export function getURLs(fileID: string): string[] {
	return getURLs.stmt.all(fileID);
}

addPart.stmt = con.prepare(`
	INSERT INTO parts
	(fileID, messageID, url)
	VALUES (?, ?, ?)
`);
export function addPart(fileID: string, messageID: string, url: string): RunResult {
	return addPart.stmt.run(fileID, messageID, url);
}

getParts.stmt = con.prepare(`
	SELECT messageID, url
	FROM parts
	WHERE fileID = ?
`);
export function getParts(fileID: string): Omit<DB.PartEntry, "fileID">[] {
	return getParts.stmt.all(fileID);
}


closeUpload.stmt = con.prepare(`
	UPDATE files
	SET uploadExpiry = 0
	WHERE id = ?
`);
export function closeUpload(id: string): RunResult {
	return closeUpload.stmt.run(id);
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
): Pick<DB.FileEntry, "id" | "uploadExpiry"> | null {
	return getFileByToken.stmt.get(token);
}

// For searching with autocomplete
interface FilenameAndID {
	id: DB.FileEntry["id"];
	name: NonNullable<DB.FileEntry["name"]>;
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

setUploadNotificationID.stmt = con.prepare(`
	UPDATE files
	SET uploadNotificationID = ?
	WHERE id = ?
`);
export function setUploadNotificationID(
	fileID: string, messageID: string
): RunResult {
	return setUploadNotificationID.stmt.run(messageID, fileID);
}

getUploadNotificationID.stmt = con.prepare(`
	SELECT uploadNotificationID
	FROM files
	WHERE id = ?
`).pluck();
export function getUploadNotificationID(
	fileID: string
): string | null {
	return getUploadNotificationID.stmt.get(fileID);
}


const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
export function generateToken(): string {
	let result = "";
	for (let i = 32; i > 0; --i) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}


export function openUpload(
	fileID: string, ownerID: string, token: string
): RunResult {
	const expiry = Date.now() + Config.uploadTokenLifespan;
	return addFile(fileID, ownerID, token, expiry);
}
