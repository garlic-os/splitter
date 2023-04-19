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


function exit() {
	console.info("Closing database connection");
	con.close();
}
process.on("exit", exit);
process.on("uncaughtException", exit);


export const pendingUploads: { [fileID: string]: DB.PendingUpload } = {};


// Update the file's name and content type
const setMetadataStmt = con.prepare<[string, string, string]>(`
	UPDATE files
	SET name = ?, contentType = ?
	WHERE id = ?
`);
export function setMetadata(
	id: string,
	name: string,
	contentType: string
): void {
	console.debug("Setting metadata", { id, name, contentType });
	setMetadataStmt.run(name, contentType, id);
}

const getMetadataStmt = con.prepare<[string]>(`
	SELECT name, contentType, ownerID
	FROM files
	WHERE id = ?
`);
export function getMetadata(
	id: string
): Pick<DB.FileEntry, "name" | "contentType" | "ownerID"> | null {
	console.debug("Getting metadata", { id });
	return getMetadataStmt.get(id);
}


const getURLsStmt = con.prepare<[string]>(`
	SELECT url
	FROM parts
	WHERE fileID = ?
`).pluck();
export function getURLs(fileID: string): string[] {
	console.debug("Getting URLs", { fileID });
	return getURLsStmt.all(fileID);
}

const addPartsStmt = con.prepare<[string, string, string]>(`
	INSERT INTO parts
	(fileID, messageID, url)
	VALUES (?, ?, ?)
`);
export const addParts = con.transaction((fileID: string, messageID: string, urls: string[]) => {
	console.debug("Adding parts", { fileID, messageID, urls });
	for (const url of urls) {
		addPartsStmt.run(fileID, messageID, url);
	}
});



const getPartsStmt = con.prepare<[string]>(`
	SELECT messageID, url
	FROM parts
	WHERE fileID = ?
`);
export function getParts(fileID: string): Omit<DB.PartEntry, "fileID">[] {
	console.debug("Getting parts", { fileID });
	return getPartsStmt.all(fileID);
}


const closeUploadStmt = con.prepare<[string]>(`
	UPDATE files
	SET uploadExpiry = 0
	WHERE id = ?
`);
export function closeUpload(id: string): void {
	console.debug("Closing upload", { id });
	closeUploadStmt.run(id);
}


const addFileStmt = con.prepare<[string, string, string, number]>(`
	INSERT INTO files
	(id, ownerID, uploadToken, uploadExpiry)
	VALUES (?, ?, ?, ?)
`);
function addFile(
	fileID: string, ownerID: string, token: string, expiry: number
): void {
	console.debug("Adding file", { fileID, ownerID, expiry });
	addFileStmt.run(fileID, ownerID, token, expiry);
}

const deleteFileStmt = con.prepare<[string]>(`
	DELETE FROM files
	WHERE id = ?
`);
export function deleteFile(id: string): void {
	console.debug("Deleting file", { id });
	deleteFileStmt.run(id);
}

const getFileByTokenStmt = con.prepare<[string | null]>(`
	SELECT id, uploadExpiry
	FROM files
	WHERE uploadToken = ?
`);
export function getFileByToken(
	token: string | null
): Pick<DB.FileEntry, "id" | "uploadExpiry"> | null {
	console.debug("Getting file by token");
	return getFileByTokenStmt.get(token);
}

// For searching with autocomplete
interface FilenameAndID {
	id: DB.FileEntry["id"];
	name: NonNullable<DB.FileEntry["name"]>;
}
const getFilenamesAndIDByAuthorIDStmt = con.prepare<[string, string]>(`
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
	return getFilenamesAndIDByAuthorIDStmt.all(ownerID, startsWith + "%");
}

const setUploadInfoStmt = con.prepare<[string, string, string]>(`
	UPDATE files
	SET channelID = ?, uploadNotifID = ?
	WHERE id = ?
`);
export function setUploadInfo(
	fileID: string, channelID: string, messageID: string
): void {
	console.debug("Setting upload info", { fileID, channelID, messageID });
	setUploadInfoStmt.run(channelID, messageID, fileID);
}

const getUploadInfoStmt = con.prepare<[string]>(`
	SELECT channelID, uploadNotifID
	FROM files
	WHERE id = ?
`);
export function getUploadInfo(
	fileID: string
): Pick<DB.FileEntry, "channelID" | "uploadNotifID"> | null {
	console.debug("Getting upload info", { fileID });
	return getUploadInfoStmt.get(fileID);
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
const getFilesByOwnerIDStmt = con.prepare<[string]>(`
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
	const rows = getFilesByOwnerIDStmt.all(ownerID);
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


const generateTokenChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
const tokenLength = 32;
export function generateToken(): string {
	let result = "";
	for (let i = tokenLength; i > 0; --i) {
		result += generateTokenChars[Math.floor(Math.random() * generateTokenChars.length)];
	}
	return result;
}


export function openUpload(
	fileID: string, ownerID: string, token: string
): void {
	const expiry = Date.now() + Config.uploadTokenLifespan;
	addFile(fileID, ownerID, token, expiry);
}
