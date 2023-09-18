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
export function setMetadata(id: string, name: string, contentType: string) {
	console.debug("Setting metadata", { id, name, contentType });
	const query = con.query<null, [string, string, string]>(`
		UPDATE files
		SET name = ?, contentType = ?
		WHERE id = ?
	`);
	query.run(name, contentType, id);
}


type Metadata = Pick<DB.FileEntry, "name" | "contentType" | "ownerID">;
export function getMetadata(id: string) {
	console.debug("Getting metadata", { id });
	const query = con.query<Metadata | null, string>(`
		SELECT name, contentType, ownerID
		FROM files
		WHERE id = ?
	`);
	return query.get(id);
}


export function getURLs(fileID: string) {
	console.debug("Getting URLs", { fileID });
	const query = con.query<string, string>(`
		SELECT url
		FROM parts
		WHERE fileID = ?
	`);
	return query.all(fileID);
}


export const addParts = con.transaction((
	fileID: string,
	messageID: string,
	urls: string[]
) => {
	console.debug("Adding parts", { fileID, messageID, urls });
	const query = con.query<null, [string, string, string]>(`
		INSERT INTO parts
		(fileID, messageID, url)
		VALUES (?, ?, ?)
	`);
	for (const url of urls) {
		query.run(fileID, messageID, url);
	}
});


export function getParts(fileID: string) {
	console.debug("Getting parts", { fileID });
	const query = con.query<Omit<DB.PartEntry, "fileID">, string>(`
		SELECT messageID, url
		FROM parts
		WHERE fileID = ?
	`);
	return query.all(fileID);
}


export function closeUpload(id: string) {
	console.debug("Closing upload", { id });
	const query = con.query<null, string>(`
		UPDATE files
		SET uploadExpiry = 0
		WHERE id = ?
	`);
	query.run(id);
}


export function deleteFile(id: string) {
	console.debug("Deleting file", { id });
	const query = con.query<null, string>(`
		DELETE FROM files
		WHERE id = ?
	`);
	query.run(id);
}


type FileByToken = Pick<DB.FileEntry, "id" | "uploadExpiry">;
export function getFileByToken(token: string | null) {
	console.debug("Getting file by token");
	const query = con.query<FileByToken | null, string | null>(`
		SELECT id, uploadExpiry
		FROM files
		WHERE uploadToken = ?
	`);
	return query.get(token);
}

// For searching with autocomplete
interface FilenameAndID {
	id: DB.FileEntry["id"];
	name: NonNullable<DB.FileEntry["name"]>;
}
export function getFilenamesAndIDByAuthorID(ownerID: string, startsWith = "") {
	console.debug("Getting filenames and IDs by author ID", { ownerID, startsWith });
	const query = con.query<FilenameAndID, [string, string]>(`
		SELECT id, name
		FROM files
		WHERE ownerID = ?
			AND name LIKE ?
			AND name IS NOT NULL
	`);
	return query.all(ownerID, startsWith + "%");
}


export function setUploadInfo(
	fileID: string, channelID: string, messageID: string
) {
	console.debug("Setting upload info", { fileID, channelID, messageID });
	const query = con.query<null, [string, string, string]>(`
		UPDATE files
		SET channelID = ?, uploadNotifID = ?
		WHERE id = ?
	`);
	query.run(channelID, messageID, fileID);
}


type UploadInfo = Pick<DB.FileEntry, "channelID" | "uploadNotifID">;
export function getUploadInfo(fileID: string) {
	console.debug("Getting upload info", { fileID });
	const query = con.query<UploadInfo | null, string>(`
		SELECT channelID, uploadNotifID
		FROM files
		WHERE id = ?
	`);
	return query.get(fileID);
}

// Get from the database the filename, contentType, and uploadNotifID of the
// first 25 files uploaded by the user sorted by the given attribute
// type SortableAttribute = "name" | "uploadNotifID" | "fileExt" | "contentType";
export function getFiles(
	// ownerID: string, iStart: number, iEnd: number, sortBy: SortableAttribute
	ownerID: string, iStart: number, iEnd: number, sortBy: string
) {
	console.debug("Getting file information", { ownerID, iStart, iEnd, sortBy });
	if (sortBy === "fileExt") {
		// const query = con.query<FileListEntry, [string, number, number]>(`
		// 	SELECT name, contentType, uploadNotifID
		// 	FROM files
		// 	WHERE ownerID = ?
		// 	ORDER BY SUBSTR(name, INSTR(name, ".") + 1)
		// 	LIMIT ?, ?
		// `);
		// return query.all(ownerID, iStart, iEnd);
		sortBy = 'SUBSTR(name, INSTR(name, ".") + 1)';
	}
	const query = con.query<
		DB.FileListEntry,
		// [string, SortableAttribute, number, number]
		[string, string, number, number]
	>(`
		SELECT name, contentType, uploadNotifID
		FROM files
		WHERE ownerID = ?
			AND name IS NOT NULL
			AND uploadNotifID IS NOT NULL
		ORDER BY ?
		LIMIT ?, ?
	`);
	return query.all(ownerID, sortBy, iStart, iEnd);
}


export function getFileCount(ownerID: string): number {
	console.debug("Getting file count", { ownerID });
	const query = con.query<{"COUNT(*)": number}, string>(`
		SELECT COUNT(*)
		FROM files
		WHERE ownerID = ?
			AND name IS NOT NULL
			AND uploadNotifID IS NOT NULL
	`);
	return Object.values(query.get(ownerID) ?? 0)[0] ?? 0;
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
interface FileExportSQLRow {
	id: DB.FileEntry["id"];
	name: DB.FileEntry["name"];
	contentType: DB.FileEntry["contentType"];
	channelID: DB.FileEntry["channelID"];
	uploadNotifID: DB.FileEntry["uploadNotifID"];
	urls: DB.PartEntry["url"];
	messageIDs: DB.PartEntry["messageID"];
}
export function getFilesByOwnerID(ownerID: string): FileExport[] {
	console.debug("Getting files by owner ID", { ownerID });
	const query = con.query<FileExportSQLRow, string>(`
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
	const rows = query.all(ownerID);
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


function addFile(
	fileID: string, ownerID: string, token: string, expiry: number
) {
	console.debug("Adding file", { fileID, ownerID, expiry });
	const query = con.query<null, [string, string, string, number]>(`
		INSERT INTO files
		(id, ownerID, uploadToken, uploadExpiry)
		VALUES (?, ?, ?, ?)
	`);
	query.run(fileID, ownerID, token, expiry);
}


export function openUpload(fileID: string, ownerID: string, token: string) {
	const expiry = Date.now() + Config.uploadTokenLifespan;
	addFile(fileID, ownerID, token, expiry);
}
