import type { RunResult } from "better-sqlite3";
import Database from "better-sqlite3";
import * as Config from "$config";


const con = new Database(Config.databasePath);
con.pragma("journal_mode = WAL");
con.pragma("foreign_keys = ON");
con.exec(`
	CREATE TABLE IF NOT EXISTS files (
		id             TEXT     PRIMARY KEY,
		ownerID        TEXT     NOT NULL,
		uploadToken    TEXT     NOT NULL,
		uploadExpiry   INTEGER  NOT NULL,
		name           TEXT     DEFAULT NULL,
		contentType    TEXT     DEFAULT "application/octet-stream",
		channelID      TEXT     DEFAULT NULL,
		uploadNotifID  TEXT     DEFAULT NULL
	) STRICT;

	CREATE TABLE IF NOT EXISTS parts (
		fileID     TEXT  REFERENCES files(id) ON DELETE CASCADE,
		messageID  TEXT  NOT NULL,
		url        TEXT  NOT NULL
	) STRICT;
`);


process.on("exit", () => {
	con.close();
});


export const pendingUploads: { [fileID: string]: DB.PendingUpload } = {};


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
	console.debug("Setting metadata", { id, name, contentType });
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
	console.debug("Getting metadata", { id });
	return getMetadata.stmt.get(id);
}


getURLs.stmt = con.prepare(`
	SELECT url
	FROM parts
	WHERE fileID = ?
`).pluck();
export function getURLs(fileID: string): string[] {
	console.debug("Getting URLs", { fileID });
	return getURLs.stmt.all(fileID);
}

addPart.stmt = con.prepare(`
	INSERT INTO parts
	(fileID, messageID, url)
	VALUES (?, ?, ?)
`);
export function addPart(fileID: string, messageID: string, url: string): RunResult {
	console.debug("Adding part", { fileID, messageID, url });
	return addPart.stmt.run(fileID, messageID, url);
}

getParts.stmt = con.prepare(`
	SELECT messageID, url
	FROM parts
	WHERE fileID = ?
`);
export function getParts(fileID: string): Omit<DB.PartEntry, "fileID">[] {
	console.debug("Getting parts", { fileID });
	return getParts.stmt.all(fileID);
}


closeUpload.stmt = con.prepare(`
	UPDATE files
	SET uploadExpiry = 0
	WHERE id = ?
`);
export function closeUpload(id: string): RunResult {
	console.debug("Closing upload", { id });
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
	console.debug("Adding file", { fileID, ownerID, token, expiry });
	return addFile.stmt.run(fileID, ownerID, token, expiry);
}

deleteFile.stmt = con.prepare(`
	DELETE FROM files
	WHERE id = ?
`);
export function deleteFile(id: string): RunResult {
	console.debug("Deleting file", { id });
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
	console.debug("Getting file by token", { token });
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
	startsWith = ""
): FilenameAndID[] {
	console.debug("Getting filenames and IDs by author ID", { ownerID, startsWith });
	return getFilenamesAndIDByAuthorID.stmt.all(ownerID, startsWith + "%");
}

setUploadInfo.stmt = con.prepare(`
	UPDATE files
	SET channelID = ?, uploadNotifID = ?
	WHERE id = ?
`);
export function setUploadInfo(
	fileID: string, channelID: string, messageID: string
): RunResult {
	console.debug("Setting upload info", { fileID, channelID, messageID });
	return setUploadInfo.stmt.run(channelID, messageID, fileID);
}

getUploadInfo.stmt = con.prepare(`
	SELECT channelID, uploadNotifID
	FROM files
	WHERE id = ?
`);
export function getUploadInfo(
	fileID: string
): Pick<DB.FileEntry, "channelID" | "uploadNotifID"> | null {
	console.debug("Getting upload info", { fileID });
	return getUploadInfo.stmt.get(fileID);
}


interface FileExport {
	id: DB.FileEntry["id"];
	name: DB.FileEntry["name"];
	contentType: DB.FileEntry["contentType"];
	channelID: DB.FileEntry["channelID"];
	uploadNotifID: DB.FileEntry["uploadNotifID"];
	parts: {
		urls: DB.PartEntry["url"][];
		messageIDs: DB.PartEntry["messageID"][];
	};
}
getFilesByOwnerID.stmt = con.prepare(`
	SELECT
		id,
		name,
		contentType,
		channelID,
		uploadNotifID,
		GROUP_CONCAT(url) AS urls,
		GROUP_CONCAT(messageID) AS messageIDs
	FROM
		files
		INNER JOIN parts
			ON parts.fileID = id
	WHERE
		ownerID = ?
`);
export function getFilesByOwnerID(ownerID: string): FileExport[] {
	console.debug("Getting files by owner ID", { ownerID });
	const rows = getFilesByOwnerID.stmt.all(ownerID);
	if (rows[0].id === null) return [];
	return rows.map((row) => {
		return {
			id: row.id,
			name: row.name,
			contentType: row.contentType,
			channelID: row.channelID,
			uploadNotifID: row.uploadNotifID,
			parts: {
				urls: row.urls.split(" "),
				messageIDs: row.messageIDs.split(" ")
			}
		};
	});
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
