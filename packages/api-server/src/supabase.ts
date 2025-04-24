import { createClient } from '@supabase/supabase-js'
import config from './config'

export const supabase =
	config.configuration.authProvider === 'supabase'
		? createClient(config.supabase.url, config.supabase.serviceRoleKey)
		: undefined

export default supabase
