import Database from "bun:sqlite";
import * as Config from "$config";


const con = new Database(Config.databasePath);
console.info("Database connected");

con.run("PRAGMA journal_mode = WAL");
con.run("PRAGMA foreign_keys = ON");
con.run(`
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
	console.info("Disconnecting from database");
	con.close();
}
process.on("exit", exit);
process.on("uncaughtException", exit);


export const pendingUploads: { [fileID: string]: DB.PendingUpload } = {};


// Update the file's name and content type
export function setMetadata(
	id: string,
	name: string,
	contentType: string
): void {
	console.debug("Setting metadata", { id, name, contentType });
	const query = con.query(`
		UPDATE files
		SET name = ?, contentType = ?
		WHERE id = ?
	`);
	query.run(name, contentType, id);
}


export function getMetadata(
	id: string
): Pick<DB.FileEntry, "name" | "contentType" | "ownerID"> | null {
	console.debug("Getting metadata", { id });
	const query = con.query(`
		SELECT name, contentType, ownerID
		FROM files
		WHERE id = ?
	`);
	return query.get(id) as any;
}


export function getURLs(fileID: string): string[] {
	console.debug("Getting URLs", { fileID });
	const query = con.query(`
		SELECT url
		FROM parts
		WHERE fileID = ?
	`);
	const row = query.all(fileID) as any;
	return row[0];
}


export const addParts = con.transaction((fileID: string, messageID: string, urls: string[]) => {
	console.debug("Adding parts", { fileID, messageID, urls });
	const query = con.query(`
		INSERT INTO parts
		(fileID, messageID, url)
		VALUES (?, ?, ?)
	`);
	for (const url of urls) {
		query.run(fileID, messageID, url);
	}
});


export function getParts(fileID: string): Omit<DB.PartEntry, "fileID">[] {
	console.debug("Getting parts", { fileID });
	const query = con.query(`
		SELECT messageID, url
		FROM parts
		WHERE fileID = ?
	`);
	return query.all(fileID) as any;
}


export function closeUpload(id: string): void {
	console.debug("Closing upload", { id });
	const query = con.query(`
		UPDATE files
		SET uploadExpiry = 0
		WHERE id = ?
	`);
	query.run(id);
}


function addFile(
	fileID: string, ownerID: string, token: string, expiry: number
): void {
	console.debug("Adding file", { fileID, ownerID, expiry });
	const query = con.query(`
		INSERT INTO files
		(id, ownerID, uploadToken, uploadExpiry)
		VALUES (?, ?, ?, ?)
	`);
	query.run(fileID, ownerID, token, expiry);
}


export function deleteFile(id: string): void {
	console.debug("Deleting file", { id });
	const query = con.query(`
		DELETE FROM files
		WHERE id = ?
	`);
	query.run(id);
}


export function getFileByToken(
	token: string | null
): Pick<DB.FileEntry, "id" | "uploadExpiry"> | null {
	console.debug("Getting file by token");
	const query = con.query(`
		SELECT id, uploadExpiry
		FROM files
		WHERE uploadToken = ?
	`);
	return query.get(token) as any;
}

// For searching with autocomplete
interface FilenameAndID {
	id: DB.FileEntry["id"];
	name: NonNullable<DB.FileEntry["name"]>;
}
export function getFilenamesAndIDByAuthorID(
	ownerID: string,
	startsWith = ""
): FilenameAndID[] {
	console.debug("Getting filenames and IDs by author ID", { ownerID, startsWith });
	const query = con.query(`
		SELECT id, name
		FROM files
		WHERE ownerID = ?
			AND name LIKE ?
			AND name IS NOT NULL
	`);
	return query.all(ownerID, startsWith + "%") as any;
}


export function setUploadInfo(
	fileID: string, channelID: string, messageID: string
): void {
	console.debug("Setting upload info", { fileID, channelID, messageID });
	const query = con.query(`
		UPDATE files
		SET channelID = ?, uploadNotifID = ?
		WHERE id = ?
	`);
	query.run(channelID, messageID, fileID);
}


export function getUploadInfo(
	fileID: string
): Pick<DB.FileEntry, "channelID" | "uploadNotifID"> | null {
	console.debug("Getting upload info", { fileID });
	const query = con.query(`
		SELECT channelID, uploadNotifID
		FROM files
		WHERE id = ?
	`);
	return query.get(fileID) as any;
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
export function getFilesByOwnerID(ownerID: string): FileExport[] {
	console.debug("Getting files by owner ID", { ownerID });
	const query = con.query(`
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
	const rows = query.all(ownerID) as any;
	if (rows[0].id === null) return [];
	return rows.map((row: any) => {
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
