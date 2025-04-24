import * as jose from 'jose'
import config from '../config'

const JWKS = jose.createRemoteJWKSet(
	new URL(`${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/certs`),
	{
		cacheMaxAge: 60000,
		timeoutDuration: 30000,
	},
)

interface KeycloakAccessToken {
	exp: number // Expiration time
	iat: number // Issued at
	auth_time: number // Authentication time
	jti: string // Token ID
	iss: string // Issuer
	aud: string[] // Audience
	sub: string // Subject (user ID)
	typ: string // Token type
	azp: string // Authorized party
	sid: string // Session ID
	acr: string // Authentication context class reference
	'allowed-origins': string[] // Allowed origins
	realm_access: {
		roles: string[] // Roles for the realm
	}
	resource_access: {
		[resource: string]: {
			roles: string[] // Roles for the resource
		}
	}
	scope: string // Scopes
	email_verified: boolean // Whether the email is verified
	name: string // Full name
	preferred_username: string // Preferred username
	given_name: string // Given name
	family_name: string // Family name
	email: string // Email address
	phone?: string // Phone number
}

/**
 * Verify a JWT token and return the decoded payload
 */
export const verifyJWT = async (token: string): Promise<jose.JWTPayload & KeycloakAccessToken> => {
	try {
		const { key, payload, protectedHeader } = await jose.jwtVerify(token, JWKS, {
			issuer: `${config.keycloak.url}/realms/${config.keycloak.realm}`,
		})
		return payload as jose.JWTPayload & KeycloakAccessToken
	} catch (error) {
		if (error instanceof jose.errors.JWTExpired) {
			throw new Error('INVALID_TOKEN_EXPIRED')
		}
		throw new Error('INVALID_TOKEN')
	}
}
