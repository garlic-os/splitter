// Format a number of bytes as human-readable text.
// https://stackoverflow.com/a/14919494
export default function humanFileSize(numBytes: number, numDecimalPlaces=1): string {
	const thresh = 1024;
	if (Math.abs(numBytes) < thresh) {
		return numBytes + " B";
	}
	const units = ["KB", "MB", "GB"];
	let u = -1;
	const r = 10 ** numDecimalPlaces;
	do {
		numBytes /= thresh;
		++u;
	} while (Math.round(Math.abs(numBytes) * r) / r >= thresh && u < units.length - 1);
	return numBytes.toFixed(numDecimalPlaces) + " " + units[u];
}
