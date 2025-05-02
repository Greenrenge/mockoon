import { Frequency, Plans, TeamRoles, User } from '@mockoon/cloud'
import { moleculerGql as gql } from 'moleculer-apollo-server'
import DbService from 'moleculer-db'
import SequelizeDbAdapter from 'moleculer-db-adapter-sequelize'
import { DataTypes, Op } from 'sequelize'
import config from '../config'
import { syncSequelize } from '../libs/dbAdapters/sequelize-utils'
import { DEFAULT_PLAN } from '../libs/saas-plan'
import { mustLogin } from '../mixins/mustLogin'
import { AppService, AppServiceSchema, AuthContextMeta } from '../types/common'

// Interfaces for our params
interface initializeTenantParams {
	tenantName: string
}

interface AddAdminParams {
	email: string
}

interface RemoveAdminParams {
	email: string
}

interface CreateTeamParams {
	name: string
	description?: string
}

interface AddTeamMemberParams {
	teamId: string
	email: string
	role: 'owner' | 'user'
}

interface RemoveTeamMemberParams {
	teamId: string
	email: string
}
type SaaSServiceSchema = AppServiceSchema<{
	additionalModels: any
}>

type TSaaSService = AppService<
	{},
	SaaSServiceSchema,
	{
		model: any
		models: any
	}
>

/**
 * SaaS service to handle application initialization, admin management, and team management
 */
const SaaSService = {
	name: 'saas',
	mixins: [DbService as any, mustLogin()],
	adapter: new SequelizeDbAdapter({
		dialect: config.database.dialect,
		...(config.database.dialect === 'sqlite'
			? {
					storage: `${config.database.storage}/saas.sqlite`,
				}
			: {
					host: config.database.host,
					port: config.database.port,
					database: config.database.database,
					username: config.database.username,
					password: config.database.password,
				}),
		...syncSequelize,
	}),
	model: {
		name: 'saas_settings',
		define: {
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			initialized: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
			tenantName: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			initializedBy: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			initializedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		options: {
			timestamps: true,
		},
	},

	settings: {
		rest: ['tenants'],
	},

	/**
	 * Service created lifecycle event handler
	 */
	async afterConnected(this: TSaaSService) {
		// Create our additional models defined in settings
		const additionalModels = {
			admins: {
				name: 'saas_admins',
				define: {
					id: {
						type: DataTypes.INTEGER,
						primaryKey: true,
						autoIncrement: true,
					},
					email: {
						type: DataTypes.STRING,
						allowNull: false,
						unique: true,
					},
					userId: {
						type: DataTypes.STRING,
						allowNull: true,
					},
					invitedBy: {
						type: DataTypes.STRING,
						allowNull: true,
					},
					invitedAt: {
						type: DataTypes.DATE,
						allowNull: true,
					},
					joinedAt: {
						type: DataTypes.DATE,
						allowNull: true,
					},
				},
				options: {
					timestamps: true,
				},
			},
			teams: {
				name: 'saas_teams',
				define: {
					id: {
						type: DataTypes.UUID,
						defaultValue: DataTypes.UUIDV4,
						primaryKey: true,
					},
					name: {
						type: DataTypes.STRING,
						allowNull: false,
					},
					description: {
						type: DataTypes.TEXT,
						allowNull: true,
					},
					createdBy: {
						type: DataTypes.STRING,
						allowNull: false,
					},
				},
				options: {
					timestamps: true,
				},
			},
			teamMembers: {
				name: 'saas_team_members',
				define: {
					id: {
						type: DataTypes.INTEGER,
						primaryKey: true,
						autoIncrement: true,
					},
					teamId: {
						type: DataTypes.UUID,
						allowNull: false,
						references: {
							model: 'saas_teams',
							key: 'id',
						},
					},
					email: {
						type: DataTypes.STRING,
						allowNull: false,
					},
					userId: {
						type: DataTypes.STRING,
						allowNull: true,
					},
					role: {
						type: DataTypes.ENUM('owner', 'user'),
						allowNull: false,
						defaultValue: 'user',
					},
					invitedBy: {
						type: DataTypes.STRING,
						allowNull: false,
					},
					invitedAt: {
						type: DataTypes.DATE,
						allowNull: false,
					},
					joinedAt: {
						type: DataTypes.DATE,
						allowNull: true,
					},
				},
				options: {
					timestamps: true,
					indexes: [
						{
							unique: true,
							fields: ['teamId', 'email'],
						},
					],
				},
			},
		}
		this.models = {
			settings: this.model!, // Main model from adapter
		}

		// Loop through our additional models and create them
		for (const [modelName, modelConfig] of Object.entries(additionalModels)) {
			this.models[modelName] = this.adapter.db.define(
				modelConfig.name,
				modelConfig.define as any,
				modelConfig.options,
			)
		}

		// Set up relationships
		this.models.teamMembers.belongsTo(this.models.teams, {
			foreignKey: 'teamId',
			as: 'team',
		})

		this.models.teams.hasMany(this.models.teamMembers, {
			foreignKey: 'teamId',
			as: 'members',
		})

		await this.Promise.all([
			syncSequelize({
				Model: this.model,
				sequelize: this.adapter.db,
			}),
			...Object.values(this.models).map((model) =>
				syncSequelize({
					Model: model as any,
					sequelize: this.adapter.db,
				}),
			),
		])

		const settingsCount = await this.models.settings.count()
		if (settingsCount === 0) {
			await this.models.settings.create({
				initialized: false,
			})
		}
	},

	/**
	 * Service started lifecycle event handler
	 */
	started(this: TSaaSService) {
		this.logger.info('SaaS service started')
	},

	actions: {
		/**
		 * Get application initialization status
		 */
		getInitializationStatus: {
			graphql: {
				type: gql`
					type InitializationStatus {
						initialized: Boolean!
						tenantName: String
						initializedAt: Date
					}
				`,
				query: gql`
					type Query {
						getInitializationStatus: InitializationStatus!
					}
				`,
			},
			rest: 'GET /initialization-status',
			async handler(this: TSaaSService) {
				const settings = await this.models.settings.findOne()
				return {
					initialized: settings.initialized,
					tenantName: settings.tenantName,
					initializedAt: settings.initializedAt,
				}
			},
		},

		/**
		 * Initialize the application
		 */
		initializeTenant: {
			graphql: {
				type: gql`
					type InitializationResponse {
						success: Boolean!
						message: String!
						tenantName: String
						created: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						initializeTenant(tenantName: String!): InitializationResponse!
					}
				`,
			},
			rest: 'POST /initialize-app',
			params: {
				tenantName: { type: 'string', min: 2 },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta<initializeTenantParams>) {
				const { tenantName } = ctx.params
				const userId = ctx.meta.accountId

				// Check if app is already initialized
				const settings = await this.models.settings.findOne()
				if (settings && settings.initialized) {
					// Return existing initialization data instead of throwing error
					return {
						success: true,
						message: 'Application was already initialized',
						tenantName: settings.tenantName,
						created: false,
					}
				}

				// Initialize the app
				await settings.update({
					initialized: true,
					tenantName,
					initializedBy: userId,
					initializedAt: new Date(),
				})

				// Add the current user as an admin
				const user = ctx.meta.user
				await this.models.admins.create({
					email: user.email,
					userId,
					invitedAt: new Date(),
					joinedAt: new Date(),
				})

				return {
					success: true,
					message: 'Application initialized successfully',
					tenantName,
					created: true,
				}
			},
		},

		me: {
			graphql: {
				type: gql`
					type MeResponse {
						id: ID!
						uid: String!
						email: String!
						displayName: String
						createdAt: Date
						updatedAt: Date
						teams: [Team!]
						plan: String
						teamId: String
						teamRole: String
						deployInstancesQuota: Int
						deployInstancesQuotaUsed: Int
						cloudSyncItemsQuota: Int
						cloudSyncItemsQuotaUsed: Int
						cloudSyncSizeQuota: Int
						cloudSyncHighestMajorVersion: Int
						templatesQuota: Int
						templatesQuotaUsed: Int
						nextQuotaResetOn: Int
						subscription: AppSubscription
						isAdmin: Boolean
					}
					type AppSubscription {
						trial: Boolean
						provider: String
						frequency: String
						createdOn: Date
						renewOn: Date
						portalEnabled: Boolean
						cancellationScheduled: Boolean
						pastDue: Boolean
						subscriptionId: String
					}
				`,
				query: gql`
					type Query {
						me: MeResponse!
					}
				`,
			},
			rest: 'GET /me',
			async handler(
				this: TSaaSService,
				ctx: AuthContextMeta,
			): Promise<User & { id: string; teams: any[]; isAdmin: boolean }> {
				await ctx.call('saas.processUserLogin', {
					userId: ctx.meta.accountId,
					email: ctx.meta.accountInfo.email,
				})
				const isAdmin = !!(await ctx.call('saas.isAdmin'))
				const userTeams = await this.models.teamMembers.findAll({
					where: { userId: ctx.meta.accountId },
					include: {
						model: this.models.teams,
						as: 'team',
					},
				})
				const [userMember] = userTeams
				const teams = userTeams.map((ut: any) => ut.team)

				const userRole = userMember?.role as TeamRoles
				const userTeamId = userMember?.teamId
				return {
					id: ctx.meta.accountId,
					uid: ctx.meta.accountId,
					email: ctx.meta.accountInfo.email,
					displayName: ctx.meta.accountInfo.displayName,
					teams,
					isAdmin,
					...(userMember
						? {
								plan: Plans.ENTERPRISE,
								teamId: userTeamId,
								teamRole: userRole,
								deployInstancesQuota: 10,
								deployInstancesQuotaUsed: 0,
								cloudSyncItemsQuota: 999,
								cloudSyncItemsQuotaUsed: 0,
								cloudSyncSizeQuota: 100000000, // 100MB
								cloudSyncHighestMajorVersion: 1,
								templatesQuota: 999,
								templatesQuotaUsed: 0,
								nextQuotaResetOn: 1,
								subscription: {
									trial: false,
									provider: 'manual' as const,
									frequency: Frequency.YEARLY,
									createdOn: 1744777380227,
									renewOn: 4079996600352,
									portalEnabled: true,
									cancellationScheduled: false,
									pastDue: false,
									subscriptionId: 'F1',
								},
							}
						: DEFAULT_PLAN),
				}
			},
		},

		/**
		 * Check if the current user is an admin
		 */
		isAdmin: {
			async handler(this: TSaaSService, ctx: AuthContextMeta) {
				const userId = ctx.meta.accountId
				const admin = await this.models.admins.findOne({
					where: { userId },
				})

				return !!admin
			},
		},

		/**
		 * Get all admins
		 */
		getAdmins: {
			graphql: {
				type: gql`
					type Admin {
						id: ID!
						email: String!
						invitedBy: String
						invitedAt: Date
						joinedAt: Date
					}
				`,
				query: gql`
					type Query {
						getAdmins: [Admin!]!
					}
				`,
			},
			rest: 'GET /admins',
			async handler(this: TSaaSService, ctx: AuthContextMeta) {
				// Check if user is an admin
				if (!ctx.meta.user.isAdmin) {
					throw new Error('Unauthorized: Only admins can view admin list')
				}

				const admins = await this.models.admins.findAll({
					order: [['createdAt', 'ASC']],
				})

				return admins
			},
		},

		/**
		 * Add a new admin by email
		 */
		addAdmin: {
			graphql: {
				type: gql`
					type AddAdminResponse {
						success: Boolean!
						message: String!
						created: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						addAdmin(email: String!): AddAdminResponse!
					}
				`,
			},
			rest: 'POST /add-admin',
			params: {
				email: { type: 'email' },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta<AddAdminParams>) {
				const { email } = ctx.params
				const userId = ctx.meta.accountId

				if (!ctx.meta.user.isAdmin) {
					throw new Error('Unauthorized: Only admins can add other admins')
				}

				// Check if app is initialized
				const settings = await this.models.settings.findOne()
				if (!settings?.initialized) {
					throw new Error('Application has not been initialized yet')
				}

				// Check if admin already exists
				const existingAdmin = await this.models.admins.findOne({
					where: { email },
				})

				let created = false

				if (existingAdmin) {
					// Admin already exists, nothing to do
					return {
						success: true,
						message: `Admin ${email} already exists`,
						created: false,
					}
				} else {
					// Add new admin
					await this.models.admins.create({
						email,
						invitedBy: userId,
						invitedAt: new Date(),
					})
					created = true
				}

				return {
					success: true,
					message: created ? `Admin invitation sent to ${email}` : `Admin ${email} already exists`,
					created,
				}
			},
		},

		/**
		 * Remove an admin by email
		 */
		removeAdmin: {
			graphql: {
				type: gql`
					type RemoveAdminResponse {
						success: Boolean!
						message: String!
						removed: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						removeAdmin(email: String!): RemoveAdminResponse!
					}
				`,
			},
			rest: 'DELETE /remove-admin',
			params: {
				email: { type: 'email' },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta<RemoveAdminParams>) {
				const { email } = ctx.params

				if (!ctx.meta.user.isAdmin) {
					throw new Error('Unauthorized: Only admins can remove other admins')
				}

				// Prevent removal of the initial admin
				const settings = await this.models.settings.findOne()
				const adminToRemove = await this.models.admins.findOne({
					where: { email },
				})

				if (!adminToRemove) {
					// Admin doesn't exist - idempotent response
					return {
						success: true,
						message: `Admin ${email} does not exist or was already removed`,
						removed: false,
					}
				}

				// Don't allow removing the initial admin who setup the application
				if (adminToRemove.userId === settings.initializedBy) {
					throw new Error('Cannot remove the initial admin')
				}

				// Check if this admin has joined (is active)
				const isJoinedAdmin = adminToRemove.joinedAt !== null

				if (isJoinedAdmin) {
					// Count the number of joined (active) admins
					const joinedAdminsCount = await this.models.admins.count({
						where: { joinedAt: { [Op.ne]: null } },
					})

					// If we're trying to delete the last joined admin, prevent deletion
					if (joinedAdminsCount <= 1) {
						throw new Error(
							'Cannot delete the last active admin. Please ensure another admin has joined before removing this user.',
						)
					}
				}

				// Remove admin
				await adminToRemove.destroy()

				return {
					success: true,
					message: `Admin ${email} has been removed`,
					removed: true,
				}
			},
		},

		/**
		 * Create a new team
		 */
		createTeam: {
			graphql: {
				type: gql`
					type CreateTeamResponse {
						success: Boolean!
						teamId: ID!
						message: String!
						created: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						createTeam(name: String!, description: String): CreateTeamResponse!
					}
				`,
			},
			rest: 'POST /create-team',
			params: {
				name: { type: 'string', min: 2 },
				description: { type: 'string', optional: true },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta<CreateTeamParams>) {
				const { name, description } = ctx.params
				const userId = ctx.meta.accountId
				if (!ctx.meta.user.isAdmin) {
					throw new Error('Unauthorized: Only admins can create teams')
				}

				// Check if team with this name already exists
				const existingTeam = await this.models.teams.findOne({
					where: { name },
				})

				let team
				let created = false

				if (existingTeam) {
					// Update existing team if description is provided
					if (description !== undefined) {
						await existingTeam.update({
							description,
							updatedAt: new Date(),
						})
					}
					team = existingTeam
				} else {
					// Create the team
					team = await this.models.teams.create({
						name,
						description,
						createdBy: userId,
					})
					created = true

					// Add the admin as a owner
					await this.models.teamMembers.create({
						teamId: team.id,
						email: ctx.meta.accountInfo.email,
						userId,
						role: 'owner',
						invitedBy: userId,
						invitedAt: new Date(),
						joinedAt: new Date(),
					})
				}

				return {
					success: true,
					teamId: team.id,
					created,
					message: created
						? `Team "${name}" created successfully`
						: `Team "${name}" already exists`,
				}
			},
		},
		deleteTeam: {
			graphql: {
				type: gql`
					type DeleteTeamResponse {
						success: Boolean!
						message: String!
						deleted: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						deleteTeam(id: ID!): DeleteTeamResponse!
					}
				`,
			},
			rest: 'DELETE /teams/:id',
			params: {
				id: { type: 'uuid' },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta) {
				const { id } = ctx.params
				const userId = ctx.meta.accountId

				// Check if team exists
				const team = await this.models.teams.findOne({
					where: { id },
				})

				if (!team) {
					// Team doesn't exist - idempotent response
					return {
						success: true,
						message: `Team with ID ${id} does not exist or was already deleted`,
						deleted: false,
					}
				}

				const isTeamAdmin = await this.models.teamMembers.findOne({
					where: { teamId: id, userId, role: 'owner' },
				})

				if (!ctx.meta.user.isAdmin && !isTeamAdmin) {
					throw new Error('Unauthorized: Only admins or team admins can delete teams')
				}

				// Delete the team
				await team.destroy()

				return {
					success: true,
					message: `Team "${team.name}" deleted successfully`,
					deleted: true,
				}
			},
		},
		/**
		 * Get all teams
		 */
		getTeams: {
			graphql: {
				type: gql`
					type Team {
						id: ID!
						name: String!
						description: String
						createdBy: String!
						createdAt: Date!
						updatedAt: Date!
						memberCount: Int!
					}
				`,
				query: gql`
					type Query {
						getTeams: [Team!]!
					}
				`,
			},
			rest: 'GET /teams',
			async handler(this: TSaaSService, ctx: AuthContextMeta) {
				const userId = ctx.meta.accountId

				// Get teams the user is a member of
				const memberTeamIds = await this.models.teamMembers.findAll({
					where: { userId },
					attributes: ['teamId'],
				})

				const teamIds = memberTeamIds.map((member: { teamId: any }) => member?.teamId)

				let teams
				if (ctx.meta.user.isAdmin) {
					// Admins can see all teams
					teams = await this.models.teams.findAll({
						include: {
							model: this.models.teamMembers,
							as: 'members',
						},
					})
				} else {
					// Regular users can only see teams they're members of
					teams = await this.models.teams.findAll({
						where: { id: teamIds },
						include: {
							model: this.models.teamMembers,
							as: 'members',
						},
					})
				}
				// Add member count to each team
				teams = await Promise.all(
					teams.map(async (team: any) => {
						const memberCount = await this.models.teamMembers.count({
							where: { teamId: team.id },
						})
						return {
							...team.toJSON(),
							memberCount,
						}
					}),
				)

				return teams
			},
		},

		/**
		 * Get a specific team by ID
		 */
		getTeam: {
			graphql: {
				type: gql`
					type TeamMember {
						id: ID!
						email: String!
						role: String!
						invitedBy: String
						invitedAt: Date
						joinedAt: Date
					}
				`,
				query: gql`
					type Query {
						getTeam(teamId: ID!): Team!
					}
				`,
			},
			rest: 'GET /teams/:teamId',
			params: {
				teamId: { type: 'uuid' },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta) {
				const { teamId } = ctx.params
				const userId = ctx.meta.accountId

				const isTeamMember = await this.models.teamMembers.findOne({
					where: { teamId, userId },
				})

				if (!ctx.meta.user.isAdmin && !isTeamMember) {
					throw new Error('Unauthorized: Access to this team denied')
				}

				// Get team with members
				const team = await this.models.teams.findOne({
					where: { id: teamId },
					include: {
						model: this.models.teamMembers,
						as: 'members',
					},
				})

				if (!team) {
					throw new Error('Team not found')
				}

				return team
			},
		},

		/**
		 * Add a member to a team
		 */
		addTeamMember: {
			graphql: {
				type: gql`
					type AddTeamMemberResponse {
						success: Boolean!
						message: String!
						created: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						addTeamMember(teamId: ID!, email: String!, role: String!): AddTeamMemberResponse!
					}
				`,
			},
			rest: 'POST /teams/:teamId/members',
			params: {
				teamId: { type: 'uuid' },
				email: { type: 'email' },
				role: { type: 'enum', values: ['owner', 'user'] },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta<AddTeamMemberParams>) {
				const { teamId, email, role } = ctx.params
				const userId = ctx.meta.accountId

				// Check if team exists
				const team = await this.models.teams.findOne({
					where: { id: teamId },
				})

				if (!team) {
					throw new Error('Team not found')
				}

				const isTeamAdmin = await this.models.teamMembers.findOne({
					where: { teamId, userId, role: 'owner' },
				})

				if (!ctx.meta.user.isAdmin && !isTeamAdmin) {
					throw new Error('Unauthorized: Only admins or team admins can add team members')
				}

				let created = false

				// Check if member already exists
				const existingMember = await this.models.teamMembers.findOne({
					where: { teamId, email },
				})

				if (existingMember) {
					// Update the member's role if different
					if (existingMember.role !== role) {
						await existingMember.update({ role })
						return {
							success: true,
							message: `Team member ${email} role updated to ${role}`,
							created: false,
						}
					} else {
						return {
							success: true,
							message: `Team member ${email} already exists with role ${role}`,
							created: false,
						}
					}
				}

				// Add the team member
				await this.models.teamMembers.create({
					teamId,
					email,
					role,
					invitedBy: userId,
					invitedAt: new Date(),
				})

				return {
					success: true,
					message: `Team member ${email} added to team with role ${role}`,
					created: true,
				}
			},
		},
		updateTeamMemberRole: {
			graphql: {
				type: gql`
					type UpdateTeamMemberRoleResponse {
						success: Boolean!
						message: String!
						updated: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						updateTeamMemberRole(
							teamId: ID!
							email: String!
							role: String!
						): UpdateTeamMemberRoleResponse!
					}
				`,
			},
			rest: 'PUT /teams/:teamId/members',
			params: {
				teamId: { type: 'uuid' },
				email: { type: 'email' },
				role: { type: 'enum', values: ['owner', 'user'] },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta<AddTeamMemberParams>) {
				const { teamId, email, role } = ctx.params
				const userId = ctx.meta.accountId
				const isTeamAdmin = await this.models.teamMembers.findOne({
					where: { teamId, userId, role: 'owner' },
				})
				if (!ctx.meta.user.isAdmin && !isTeamAdmin) {
					throw new Error('Unauthorized: Only admins or team admins can update team members')
				}
				// Check if team exists
				const team = await this.models.teams.findOne({
					where: { id: teamId },
				})
				if (!team) {
					throw new Error('Team not found')
				}
				// Find the member to update
				const memberToUpdate = await this.models.teamMembers.findOne({
					where: { teamId, email },
				})

				// If member doesn't exist, return helpful error message
				if (!memberToUpdate) {
					throw new Error(`Team member ${email} not found. Use addTeamMember to add a new member.`)
				}

				// If role isn't changing, no need to update
				if (memberToUpdate.role === role) {
					return {
						success: true,
						message: `Team member ${email} already has role ${role}`,
						updated: false,
					}
				}

				// Prevent changing the last owner to user
				if (memberToUpdate.role === 'owner' && role === 'user') {
					const teamAdminCount = await this.models.teamMembers.count({
						where: { teamId, role: 'owner' },
					})
					if (teamAdminCount <= 1) {
						throw new Error('Cannot change the last team admin to user')
					}
				}

				// Update the team member role
				await memberToUpdate.update({
					role,
				})

				return {
					success: true,
					message: `Team member ${email} updated to role ${role}`,
					updated: true,
				}
			},
		},
		/**
		 * Remove a member from a team
		 */
		removeTeamMember: {
			graphql: {
				type: gql`
					type RemoveTeamMemberResponse {
						success: Boolean!
						message: String!
						removed: Boolean!
					}
				`,
				mutation: gql`
					type Mutation {
						removeTeamMember(teamId: ID!, email: String!): RemoveTeamMemberResponse!
					}
				`,
			},
			rest: 'DELETE /teams/:teamId/members',
			params: {
				teamId: { type: 'uuid' },
				email: { type: 'email' },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta<RemoveTeamMemberParams>) {
				const { teamId, email } = ctx.params
				const userId = ctx.meta.accountId

				// Check if team exists
				const team = await this.models.teams.findOne({
					where: { id: teamId },
				})

				if (!team) {
					throw new Error('Team not found')
				}

				const isTeamAdmin = await this.models.teamMembers.findOne({
					where: { teamId, userId, role: 'owner' },
				})

				if (!ctx.meta.user.isAdmin && !isTeamAdmin) {
					throw new Error('Unauthorized: Only admins or team admins can remove team members')
				}

				// Find the member to remove
				const memberToRemove = await this.models.teamMembers.findOne({
					where: { teamId, email },
				})

				if (!memberToRemove) {
					// Member already removed or never existed - idempotent response
					return {
						success: true,
						message: `Team member ${email} is not in the team`,
						removed: false,
					}
				}

				// Prevent removing the last owner
				if (memberToRemove.role === 'owner') {
					const teamAdminCount = await this.models.teamMembers.count({
						where: { teamId, role: 'owner' },
					})

					if (teamAdminCount <= 1) {
						throw new Error('Cannot remove the last team admin')
					}
				}

				// Remove the team member
				await memberToRemove.destroy()

				return {
					success: true,
					message: `Team member ${email} removed from team`,
					removed: true,
				}
			},
		},
		/**
 * teamMembers(teamId: $teamId) {
      id
      email
      role
      joinedAt
    }
 */
		teamMembers: {
			graphql: {
				query: gql`
					type Query {
						teamMembers(teamId: ID!): [TeamMember!]!
					}
				`,
			},
			rest: 'GET /teams/:teamId/members',
			params: {
				teamId: { type: 'uuid' },
			},
			async handler(this: TSaaSService, ctx: AuthContextMeta) {
				const { teamId } = ctx.params
				const userId = ctx.meta.accountId

				// Check if team exists
				const team = await this.models.teams.findOne({
					where: { id: teamId },
				})

				if (!team) {
					throw new Error('Team not found')
				}

				const isTeamAdmin = await this.models.teamMembers.findOne({
					where: { teamId, userId, role: 'owner' },
				})

				if (!ctx.meta.user.isAdmin && !isTeamAdmin) {
					throw new Error('Unauthorized: Only admins or team admins can view team members')
				}

				// Get team members
				const members = await this.models.teamMembers.findAll({
					where: { teamId },
					include: {
						model: this.models.teams,
						as: 'team',
					},
				})

				return members
			},
		},
		/**
		 * Process user login - automatically assign admin and team roles based on email matches
		 * This is called by the auth service when a user logs in
		 */
		processUserLogin: {
			params: {
				userId: { type: 'string' },
				email: { type: 'email' },
			},
			async handler(
				this: TSaaSService,
				ctx: AuthContextMeta<{
					userId: string
					email: string
				}>,
			) {
				const { userId, email } = ctx.params

				// Process admin invitation if exists
				const adminInvitation = await this.models.admins.findOne({
					where: { email, userId: null },
				})

				if (adminInvitation) {
					await adminInvitation.update({
						userId,
						joinedAt: new Date(),
					})
					this.logger.info(`User ${email} joined as admin`)
				}

				// Process team member invitations
				const teamInvitations = await this.models.teamMembers.findAll({
					where: { email, userId: null },
				})

				for (const invitation of teamInvitations) {
					await invitation.update({
						userId,
						joinedAt: new Date(),
					})
					this.logger.info(`User ${email} joined team ${invitation.teamId} as ${invitation.role}`)
				}

				return {
					success: true,
					adminJoined: !!adminInvitation,
					teamsJoined: teamInvitations.length,
				}
			},
		},
	},
}

export default SaaSService
