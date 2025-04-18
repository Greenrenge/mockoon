import { deterministicStringify } from '@mockoon/commons'
import { createHash } from 'crypto'

export function calcHash(data: any): string {
	const dataString = deterministicStringify(data)
	const hashA = createHash('sha1').update(dataString, 'utf-8').digest('hex')

	// const msgUint8 = new TextEncoder().encode(dataString)
	// const hashBuffer = await subtle.digest('SHA-1', msgUint8)
	// const hashArray = Array.from(new Uint8Array(hashBuffer))
	// const hashB = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

	return hashA
}
