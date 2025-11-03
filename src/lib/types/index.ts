export interface Template {
  name: string
  user_id: string
  template_id: string
  is_prebuilt: boolean
  config: {
    category: string | null
    logo: string | null
    description: string | null
    features: string[]
  }

  deploy_status?: 'in_progress' | 'completed'
  accessible_url?: string
}

export interface SessionInfo {
  access_token: string
  refresh_token: string
  user: Session
  expires_at: number
}

export interface Session {
  id: string
  email: string
  user_metadata: UserMetadata
}

export interface UserMetadata {
  avatar_url: string
  email: string
  email_verified: boolean
  iss: string
  phone_verified: boolean
  preferred_username: string
  provider_id: string
  sub: string
  user_name: string
}
