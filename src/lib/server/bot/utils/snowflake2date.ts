// https://gist.github.com/foobball/f29ba5ddc0fd872d4311bed8fd306f39
export function snowflake2date(snowflake: string): Date {
	const dateBits = Number(BigInt.asUintN(64, BigInt(snowflake)) >> 22n);
	return new Date(dateBits + 1420070400000);
}
